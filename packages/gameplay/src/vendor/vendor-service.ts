import type { EntityId } from "@game/core";
import type { CurrencyService } from "../currency/currency-service.js";
import type { InventoryManager } from "../inventory/inventory-manager.js";
import { effectiveMaxStack, type StackInfoResolver } from "../inventory/types.js";
import { getOffer, totalPrice } from "./vendor-catalogue.js";
import type { VendorRegistry } from "./vendor-registry.js";
import {
  VENDOR_CURRENCY_ID,
  VENDOR_SALE_SOURCE,
  VENDOR_SPEND_SOURCE,
  roleAllowsPlayerBuy,
  roleAllowsPlayerSell,
  type EquippedItemsSourceLike,
  type ItemLockResolver,
  type VendorBuyOutcome,
  type VendorOfferLike,
  type VendorResult,
  type VendorSellOutcome,
  type VendorTransactionRequest,
  vendorFail,
  vendorOk,
} from "./types.js";

interface ValidatedTransaction {
  readonly offer: VendorOfferLike;
  readonly unitPrice: number;
  readonly total: number;
}

type StorageOwnersResolver = (playerEntityId: EntityId) => readonly EntityId[];

/**
 * Fixed-price NPC vendor transactions. The optional storage resolver lets an
 * application expose several player-owned storages (for example Inventory +
 * Bank) without coupling the gameplay package to a client-specific manager.
 */
export class VendorService {
  constructor(
    private readonly registry: VendorRegistry,
    private readonly currencyService: CurrencyService,
    private readonly inventoryManager: InventoryManager,
    private readonly equipmentManager?: EquippedItemsSourceLike,
    private readonly stackResolver?: StackInfoResolver,
    private readonly lockResolver?: ItemLockResolver,
    private readonly storageOwnersResolver?: StorageOwnersResolver,
  ) {}

  validateBuy(request: VendorTransactionRequest): VendorResult<ValidatedTransaction> {
    const validated = this.validateCommon(request, "buy");
    if (!validated.ok) return validated;
    const { total } = validated.value;
    const affordable = this.currencyService.canSpend(
      request.walletId,
      VENDOR_CURRENCY_ID,
      total,
    );
    if (!affordable.ok) {
      if (affordable.reason === "wallet_not_found") return vendorFail("wallet_not_found");
      if (affordable.reason === "insufficient_balance") return vendorFail("insufficient_silver");
      return vendorFail("transaction_failed");
    }
    if (this.receivableQuantity(request.playerEntityId, request.itemId) < request.quantity) {
      return vendorFail("insufficient_capacity");
    }
    return validated;
  }

  buyFromVendor(request: VendorTransactionRequest): VendorResult<VendorBuyOutcome> {
    const validated = this.validateBuy(request);
    if (!validated.ok) return validated;
    const { total } = validated.value;
    const debited = this.currencyService.debit(
      request.walletId,
      VENDOR_CURRENCY_ID,
      total,
      VENDOR_SPEND_SOURCE,
    );
    if (!debited.ok) return vendorFail("transaction_failed");

    let remaining = request.quantity;
    const credited: { ownerId: EntityId; quantity: number }[] = [];
    for (const ownerId of this.storageOwners(request.playerEntityId)) {
      if (remaining <= 0) break;
      const added = this.inventoryManager.addQuantity(
        ownerId,
        request.itemId,
        remaining,
        this.stackResolver?.(request.itemId),
      );
      if (!added.ok || added.value.added <= 0) continue;
      credited.push({ ownerId, quantity: added.value.added });
      remaining = added.value.remainder;
    }

    if (remaining > 0) {
      for (const entry of [...credited].reverse()) {
        this.inventoryManager.removeQuantity(entry.ownerId, request.itemId, entry.quantity);
      }
      this.currencyService.credit(request.walletId, VENDOR_CURRENCY_ID, total);
      return vendorFail("insufficient_capacity");
    }

    return vendorOk({
      itemId: request.itemId,
      quantity: request.quantity,
      totalPrice: total,
      newBalance: debited.value,
    });
  }

  validateSell(request: VendorTransactionRequest): VendorResult<ValidatedTransaction> {
    const validated = this.validateCommon(request, "sell");
    if (!validated.ok) return validated;
    if (!this.currencyService.hasWallet(request.walletId)) return vendorFail("wallet_not_found");

    const available = this.storageOwners(request.playerEntityId).reduce(
      (total, ownerId) => total + this.inventoryManager.getTotalQuantity(ownerId, request.itemId),
      0,
    );
    if (available < request.quantity) {
      if (this.isItemEquipped(request.playerEntityId, request.itemId)) {
        return vendorFail("item_equipped");
      }
      return vendorFail("insufficient_item_quantity");
    }
    if (this.lockResolver?.(request.playerEntityId, request.itemId) === true) {
      return vendorFail("item_locked");
    }
    return validated;
  }

  sellToVendor(request: VendorTransactionRequest): VendorResult<VendorSellOutcome> {
    const validated = this.validateSell(request);
    if (!validated.ok) return validated;
    const { total } = validated.value;

    let remaining = request.quantity;
    const removedEntries: { ownerId: EntityId; quantity: number }[] = [];
    for (const ownerId of this.storageOwners(request.playerEntityId)) {
      if (remaining <= 0) break;
      const available = this.inventoryManager.getTotalQuantity(ownerId, request.itemId);
      const quantity = Math.min(available, remaining);
      if (quantity <= 0) continue;
      const removed = this.inventoryManager.removeQuantity(ownerId, request.itemId, quantity);
      if (!removed.ok) {
        this.restoreSaleItems(request.itemId, removedEntries);
        return vendorFail("transaction_failed");
      }
      removedEntries.push({ ownerId, quantity });
      remaining -= quantity;
    }
    if (remaining > 0) {
      this.restoreSaleItems(request.itemId, removedEntries);
      return vendorFail("transaction_failed");
    }

    const credited = this.currencyService.credit(
      request.walletId,
      VENDOR_CURRENCY_ID,
      total,
      VENDOR_SALE_SOURCE,
    );
    if (!credited.ok) {
      this.restoreSaleItems(request.itemId, removedEntries);
      return vendorFail("transaction_failed");
    }
    return vendorOk({
      itemId: request.itemId,
      quantity: request.quantity,
      totalProceeds: total,
      newBalance: credited.value,
    });
  }

  private validateCommon(
    request: VendorTransactionRequest,
    direction: "buy" | "sell",
  ): VendorResult<ValidatedTransaction> {
    const vendor = this.registry.get(request.vendorId);
    if (vendor === undefined) return vendorFail("vendor_not_found");
    if (!vendor.enabled) return vendorFail("vendor_disabled");
    const allowed = direction === "buy"
      ? roleAllowsPlayerBuy(vendor.role)
      : roleAllowsPlayerSell(vendor.role);
    if (!allowed) return vendorFail("operation_not_supported");
    const offer = getOffer(vendor, request.itemId);
    if (offer === undefined) return vendorFail("offer_not_found");
    if (!offer.enabled) return vendorFail("offer_disabled");
    const unitPrice = direction === "buy" ? offer.buyPrice : offer.sellPrice;
    if (unitPrice === null) return vendorFail("price_not_defined");
    if (!Number.isSafeInteger(request.quantity) || request.quantity < 1) {
      return vendorFail("invalid_quantity");
    }
    if (offer.maxPerTransaction !== null && request.quantity > offer.maxPerTransaction) {
      return vendorFail("quantity_limit_exceeded");
    }
    const total = totalPrice(unitPrice, request.quantity);
    if (!total.ok) return total;
    return vendorOk({ offer, unitPrice, total: total.value });
  }

  private storageOwners(entityId: EntityId): readonly EntityId[] {
    const resolved = this.storageOwnersResolver?.(entityId) ?? [entityId];
    const unique = [...new Set(resolved)];
    return unique.length > 0 ? unique : [entityId];
  }

  /** Quantity of an item all accessible player storages can still absorb. */
  private receivableQuantity(entityId: EntityId, itemId: string): number {
    const resolver = this.stackResolver ?? this.inventoryManager.stackInfoResolver;
    const maxStack = effectiveMaxStack(resolver?.(itemId));
    let receivable = 0;
    for (const ownerId of this.storageOwners(entityId)) {
      for (const slot of this.inventoryManager.listSlots(ownerId)) {
        if (slot.entry === undefined) {
          receivable += maxStack;
        } else if (slot.entry.itemId === itemId && slot.entry.quantity < maxStack) {
          receivable += maxStack - slot.entry.quantity;
        }
      }
    }
    return receivable;
  }

  private restoreSaleItems(
    itemId: string,
    entries: readonly { ownerId: EntityId; quantity: number }[],
  ): void {
    for (const entry of entries) {
      const restored = this.inventoryManager.addQuantity(
        entry.ownerId,
        itemId,
        entry.quantity,
        this.stackResolver?.(itemId),
      );
      if (!restored.ok || restored.value.remainder !== 0) {
        throw new Error("Vendor sale rollback failed");
      }
    }
  }

  private isItemEquipped(entityId: EntityId, itemId: string): boolean {
    if (this.equipmentManager === undefined) return false;
    for (const entry of this.equipmentManager.getEquipped(entityId).values()) {
      if (entry.itemId === itemId) return true;
    }
    return false;
  }
}

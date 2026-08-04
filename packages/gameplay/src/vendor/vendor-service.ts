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

/**
 * Fixed-price NPC vendor transactions (36_VENDOR_SYSTEM). All operations are
 * atomic and go exclusively through CurrencyService and the public
 * InventoryManager API — on any validation failure nothing changes.
 */
export class VendorService {
  constructor(
    private readonly registry: VendorRegistry,
    private readonly currencyService: CurrencyService,
    private readonly inventoryManager: InventoryManager,
    private readonly equipmentManager?: EquippedItemsSourceLike,
    private readonly stackResolver?: StackInfoResolver,
    private readonly lockResolver?: ItemLockResolver,
  ) {}

  validateBuy(request: VendorTransactionRequest): VendorResult<ValidatedTransaction> {
    const validated = this.validateCommon(request, "buy");
    if (!validated.ok) {
      return validated;
    }
    const { total } = validated.value;
    const affordable = this.currencyService.canSpend(
      request.walletId,
      VENDOR_CURRENCY_ID,
      total,
    );
    if (!affordable.ok) {
      if (affordable.reason === "wallet_not_found") {
        return vendorFail("wallet_not_found");
      }
      if (affordable.reason === "insufficient_balance") {
        return vendorFail("insufficient_silver");
      }
      return vendorFail("transaction_failed");
    }
    // 36_VENDOR_SYSTEM "Inventory Integration": if the purchase cannot fit
    // entirely, the transaction fails and no Silver is consumed.
    if (this.receivableQuantity(request.playerEntityId, request.itemId) < request.quantity) {
      return vendorFail("insufficient_capacity");
    }
    return validated;
  }

  buyFromVendor(request: VendorTransactionRequest): VendorResult<VendorBuyOutcome> {
    const validated = this.validateBuy(request);
    if (!validated.ok) {
      return validated;
    }
    const { total } = validated.value;
    const debited = this.currencyService.debit(
      request.walletId,
      VENDOR_CURRENCY_ID,
      total,
      VENDOR_SPEND_SOURCE,
    );
    if (!debited.ok) {
      return vendorFail("transaction_failed");
    }
    const added = this.inventoryManager.addQuantity(
      request.playerEntityId,
      request.itemId,
      request.quantity,
      this.stackResolver?.(request.itemId),
    );
    if (!added.ok || added.value.remainder > 0) {
      if (added.ok && added.value.added > 0) {
        this.inventoryManager.removeQuantity(
          request.playerEntityId,
          request.itemId,
          added.value.added,
        );
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
    if (!validated.ok) {
      return validated;
    }
    if (!this.currencyService.hasWallet(request.walletId)) {
      return vendorFail("wallet_not_found");
    }
    // Equipped items live in the EquipmentComponent, outside the inventory
    // (31_EQUIPMENT_SYSTEM), so they can never be consumed by a sale; the
    // explicit check surfaces the spec's "item is equipped" rejection.
    const available = this.inventoryManager.getTotalQuantity(
      request.playerEntityId,
      request.itemId,
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
    if (!validated.ok) {
      return validated;
    }
    const { total } = validated.value;
    const removed = this.inventoryManager.removeQuantity(
      request.playerEntityId,
      request.itemId,
      request.quantity,
    );
    if (!removed.ok) {
      return vendorFail("transaction_failed");
    }
    const credited = this.currencyService.credit(
      request.walletId,
      VENDOR_CURRENCY_ID,
      total,
      VENDOR_SALE_SOURCE,
    );
    if (!credited.ok) {
      this.inventoryManager.addQuantity(
        request.playerEntityId,
        request.itemId,
        request.quantity,
        this.stackResolver?.(request.itemId),
      );
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
    if (vendor === undefined) {
      return vendorFail("vendor_not_found");
    }
    if (!vendor.enabled) {
      return vendorFail("vendor_disabled");
    }
    const allowed =
      direction === "buy" ? roleAllowsPlayerBuy(vendor.role) : roleAllowsPlayerSell(vendor.role);
    if (!allowed) {
      return vendorFail("operation_not_supported");
    }
    const offer = getOffer(vendor, request.itemId);
    if (offer === undefined) {
      return vendorFail("offer_not_found");
    }
    if (!offer.enabled) {
      return vendorFail("offer_disabled");
    }
    const unitPrice = direction === "buy" ? offer.buyPrice : offer.sellPrice;
    if (unitPrice === null) {
      return vendorFail("price_not_defined");
    }
    if (!Number.isSafeInteger(request.quantity) || request.quantity < 1) {
      return vendorFail("invalid_quantity");
    }
    if (offer.maxPerTransaction !== null && request.quantity > offer.maxPerTransaction) {
      return vendorFail("quantity_limit_exceeded");
    }
    const total = totalPrice(unitPrice, request.quantity);
    if (!total.ok) {
      return total;
    }
    return vendorOk({ offer, unitPrice, total: total.value });
  }

  /** Quantity of an item the inventory can still absorb under its stack rules. */
  private receivableQuantity(entityId: EntityId, itemId: string): number {
    const resolver = this.stackResolver ?? this.inventoryManager.stackInfoResolver;
    const maxStack = effectiveMaxStack(resolver?.(itemId));
    let receivable = 0;
    for (const slot of this.inventoryManager.listSlots(entityId)) {
      if (slot.entry === undefined) {
        receivable += maxStack;
      } else if (slot.entry.itemId === itemId && slot.entry.quantity < maxStack) {
        receivable += maxStack - slot.entry.quantity;
      }
    }
    return receivable;
  }

  private isItemEquipped(entityId: EntityId, itemId: string): boolean {
    if (this.equipmentManager === undefined) {
      return false;
    }
    for (const entry of this.equipmentManager.getEquipped(entityId).values()) {
      if (entry.itemId === itemId) {
        return true;
      }
    }
    return false;
  }
}

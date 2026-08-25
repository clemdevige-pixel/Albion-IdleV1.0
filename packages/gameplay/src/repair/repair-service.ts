import type { EntityId } from "@game/core";
import type { CurrencyService } from "../currency/currency-service.js";
import type { EquipmentManager } from "../equipment/equipment-manager.js";
import { EQUIPMENT_SLOTS } from "../equipment/types.js";
import type { InventoryManager } from "../inventory/inventory-manager.js";
import type { InventoryEntry, ItemInstanceId } from "../inventory/types.js";
import type { ItemLockResolver } from "../vendor/types.js";
import type { DurabilityStore } from "./durability-store.js";
import type { RepairCostResolver } from "./repair-cost-resolver.js";
import type { RepairStationRegistry } from "./repair-station-registry.js";
import {
  REPAIR_CURRENCY_ID,
  REPAIR_SPEND_SOURCE,
  type BulkRepairOutcome,
  type BulkRepairRequest,
  type InCombatResolver,
  type RepairOutcome,
  type RepairPreview,
  type RepairRequest,
  type RepairResult,
  type RepairStationDefinitionLike,
  type RepairableInfoResolver,
  repairFail,
  repairOk,
} from "./types.js";

interface ValidatedRepair {
  readonly entry: InventoryEntry;
  readonly currentDurability: number;
  readonly maxDurability: number;
  readonly cost: number;
}

type StorageOwnersResolver = (playerEntityId: EntityId) => readonly EntityId[];

/**
 * Repair runtime. The optional storage resolver exposes additional player-owned
 * storage (for example Bank) without coupling gameplay to client composition.
 */
export class RepairService {
  private readonly processedTransactions = new Set<string>();

  constructor(
    private readonly costResolver: RepairCostResolver,
    private readonly stationRegistry: RepairStationRegistry,
    private readonly currencyService: CurrencyService,
    private readonly inventoryManager: InventoryManager,
    private readonly equipmentManager: EquipmentManager,
    private readonly durabilityStore: DurabilityStore,
    private readonly resolveRepairableInfo: RepairableInfoResolver,
    private readonly isInCombat?: InCombatResolver,
    private readonly lockResolver?: ItemLockResolver,
    private readonly storageOwnersResolver?: StorageOwnersResolver,
  ) {}

  /** Cost preview only — never mutates any state. */
  previewRepair(request: Omit<RepairRequest, "transactionId">): RepairResult<RepairPreview> {
    const station = this.validateStation(request.stationId);
    if (!station.ok) return station;
    const validated = this.validateItem(
      request.playerEntityId,
      request.instanceId,
      station.value,
    );
    if (!validated.ok) return validated;
    const { entry, currentDurability, maxDurability, cost } = validated.value;
    return repairOk({
      instanceId: entry.instanceId,
      itemId: entry.itemId,
      currentDurability,
      maxDurability,
      cost,
    });
  }

  repair(request: RepairRequest): RepairResult<RepairOutcome> {
    if (this.processedTransactions.has(request.transactionId)) {
      return repairFail("duplicate_transaction");
    }
    const context = this.validateContext(request.playerEntityId, request.stationId);
    if (!context.ok) return context;
    const validated = this.validateItem(
      request.playerEntityId,
      request.instanceId,
      context.value,
    );
    if (!validated.ok) return validated;
    const affordable = this.canAfford(request.walletId, validated.value.cost);
    if (!affordable.ok) return affordable;
    const outcome = this.executeRepairs(request.walletId, [validated.value]);
    if (!outcome.ok) return outcome;
    this.processedTransactions.add(request.transactionId);
    const repaired = outcome.value.repaired[0];
    if (repaired === undefined) return repairFail("transaction_failed");
    return repairOk(repaired);
  }

  /**
   * Repairs every damaged repairable item owned by the player: equipped first,
   * then accessible storages in resolver order (Inventory before Bank in live).
   */
  bulkRepair(request: BulkRepairRequest): RepairResult<BulkRepairOutcome> {
    if (this.processedTransactions.has(request.transactionId)) {
      return repairFail("duplicate_transaction");
    }
    const context = this.validateContext(request.playerEntityId, request.stationId);
    if (!context.ok) return context;
    const station = context.value;

    const candidates: InventoryEntry[] = [];
    const equipped = this.equipmentManager.getEquipped(request.playerEntityId);
    for (const slot of EQUIPMENT_SLOTS) {
      const entry = equipped.get(slot);
      if (entry !== undefined && this.isDamaged(entry)) candidates.push(entry);
    }
    for (const ownerId of this.storageOwners(request.playerEntityId)) {
      for (const slot of this.inventoryManager.listSlots(ownerId)) {
        if (slot.entry !== undefined && this.isDamaged(slot.entry)) candidates.push(slot.entry);
      }
    }
    if (candidates.length === 0) return repairFail("nothing_to_repair");

    const validatedList: ValidatedRepair[] = [];
    let totalCost = 0;
    for (const entry of candidates) {
      const validated = this.validateItem(request.playerEntityId, entry.instanceId, station);
      if (!validated.ok) return validated;
      validatedList.push(validated.value);
      totalCost += validated.value.cost;
      if (!Number.isSafeInteger(totalCost)) return repairFail("cost_overflow");
    }
    const affordable = this.canAfford(request.walletId, totalCost);
    if (!affordable.ok) return affordable;
    const outcome = this.executeRepairs(request.walletId, validatedList);
    if (!outcome.ok) return outcome;
    this.processedTransactions.add(request.transactionId);
    return outcome;
  }

  private validateContext(
    entityId: EntityId,
    stationId: string,
  ): RepairResult<RepairStationDefinitionLike> {
    if (this.isInCombat?.(entityId) === true) return repairFail("in_combat");
    return this.validateStation(stationId);
  }

  private validateStation(stationId: string): RepairResult<RepairStationDefinitionLike> {
    const station = this.stationRegistry.get(stationId);
    if (station === undefined) return repairFail("station_not_found");
    if (!station.enabled) return repairFail("station_disabled");
    return repairOk(station);
  }

  private validateItem(
    entityId: EntityId,
    instanceId: ItemInstanceId,
    station: RepairStationDefinitionLike,
  ): RepairResult<ValidatedRepair> {
    const entry = this.findOwnedEntry(entityId, instanceId);
    if (entry === undefined) {
      return repairFail(
        this.durabilityStore.isDestroyed(instanceId) ? "item_destroyed" : "item_not_found",
      );
    }
    if (this.durabilityStore.isDestroyed(instanceId)) return repairFail("item_destroyed");
    const info = this.resolveRepairableInfo(entry.itemId);
    const durability = this.durabilityStore.get(instanceId);
    if (info === undefined || durability === undefined) return repairFail("not_repairable");
    if (durability.current >= durability.max) return repairFail("item_intact");
    if (this.lockResolver?.(entityId, entry.itemId) === true) return repairFail("item_locked");
    const cost = this.costResolver.resolveCost(
      info.equipmentCategory,
      info.itemTier,
      durability.current,
      durability.max,
      station.repairModifier,
    );
    if (!cost.ok) return cost;
    return repairOk({
      entry,
      currentDurability: durability.current,
      maxDurability: durability.max,
      cost: cost.value,
    });
  }

  private canAfford(walletId: BulkRepairRequest["walletId"], cost: number): RepairResult<number> {
    if (!this.currencyService.hasWallet(walletId)) return repairFail("wallet_not_found");
    if (cost === 0) return repairOk(0);
    const affordable = this.currencyService.canSpend(walletId, REPAIR_CURRENCY_ID, cost);
    if (!affordable.ok) {
      if (affordable.reason === "insufficient_balance") return repairFail("insufficient_silver");
      return repairFail("transaction_failed");
    }
    return repairOk(cost);
  }

  private executeRepairs(
    walletId: BulkRepairRequest["walletId"],
    validatedList: readonly ValidatedRepair[],
  ): RepairResult<BulkRepairOutcome> {
    let totalCost = 0;
    for (const validated of validatedList) totalCost += validated.cost;
    let newBalance: number;
    if (totalCost > 0) {
      const debited = this.currencyService.debit(
        walletId,
        REPAIR_CURRENCY_ID,
        totalCost,
        REPAIR_SPEND_SOURCE,
      );
      if (!debited.ok) return repairFail("transaction_failed");
      newBalance = debited.value;
    } else {
      const balance = this.currencyService.getBalance(walletId, REPAIR_CURRENCY_ID);
      if (!balance.ok) return repairFail("transaction_failed");
      newBalance = balance.value;
    }
    const repaired: RepairOutcome[] = [];
    for (const validated of validatedList) {
      const restored = this.durabilityStore.restoreToMax(validated.entry.instanceId);
      if (!restored.ok) {
        for (const done of repaired) {
          this.durabilityStore.applyDamage(
            done.instanceId,
            done.newDurability - done.previousDurability,
          );
        }
        if (totalCost > 0) this.currencyService.credit(walletId, REPAIR_CURRENCY_ID, totalCost);
        return repairFail("transaction_failed");
      }
      repaired.push({
        instanceId: validated.entry.instanceId,
        itemId: validated.entry.itemId,
        previousDurability: validated.currentDurability,
        newDurability: restored.value.current,
        silverCost: validated.cost,
        newBalance,
      });
    }
    return repairOk({ repaired, totalCost, newBalance });
  }

  private findOwnedEntry(
    entityId: EntityId,
    instanceId: ItemInstanceId,
  ): InventoryEntry | undefined {
    for (const entry of this.equipmentManager.getEquipped(entityId).values()) {
      if (entry.instanceId === instanceId) return entry;
    }
    for (const ownerId of this.storageOwners(entityId)) {
      const found = this.inventoryManager.findEntryByInstanceId(ownerId, instanceId)?.entry;
      if (found !== undefined) return found;
    }
    return undefined;
  }

  private storageOwners(entityId: EntityId): readonly EntityId[] {
    const resolved = this.storageOwnersResolver?.(entityId) ?? [entityId];
    const unique = [...new Set(resolved)];
    return unique.length > 0 ? unique : [entityId];
  }

  private isDamaged(entry: InventoryEntry): boolean {
    if (this.resolveRepairableInfo(entry.itemId) === undefined) return false;
    const durability = this.durabilityStore.get(entry.instanceId);
    return durability !== undefined && durability.current < durability.max;
  }
}

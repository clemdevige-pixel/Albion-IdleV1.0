import type { EntityId } from "@game/core";
import type { WalletId } from "../currency/types.js";
import type { ItemInstanceId } from "../inventory/types.js";

/** 34_REPAIR_SYSTEM "Repair Cost": every repair consumes Silver. */
export const REPAIR_CURRENCY_ID = "currency_silver";

/**
 * 34_REPAIR_SYSTEM "Repair Buildings": repairs go through a dedicated
 * building, so they use the "Building" spending source from 39_CURRENCY_DATA.
 */
export const REPAIR_SPEND_SOURCE = "Building";

/** 34_REPAIR_SYSTEM "Repair Locations": V1 supports cities and Player Island. */
export type RepairLocationType = "city" | "player_island";

export const REPAIR_LOCATION_TYPES: readonly RepairLocationType[] = ["city", "player_island"];

/** RepairCostTable row (34_REPAIR_SYSTEM "Data Tables"). Structural, like VendorOfferLike. */
export interface RepairCostDefinitionLike {
  readonly equipmentCategory: string;
  readonly itemTier: number;
  readonly baseRepairCost: number;
  readonly costMultiplier: number;
  readonly enabled: boolean;
}

/** RepairStationTable row (34_REPAIR_SYSTEM "Data Tables"). */
export interface RepairStationDefinitionLike {
  readonly stationId: string;
  readonly locationType: RepairLocationType;
  readonly repairModifier: number;
  readonly enabled: boolean;
}

/**
 * Repair-relevant projection of an equipment definition (23_EQUIPMENT_DATA:
 * category, tier, maxDurability). Items without repair info are not
 * repairable equipment.
 */
export interface RepairableInfoLike {
  readonly itemId: string;
  readonly equipmentCategory: string;
  readonly itemTier: number;
}

export type RepairableInfoResolver = (itemId: string) => RepairableInfoLike | undefined;

/** 34_REPAIR_SYSTEM validation: "The player is not in combat" — no combat coupling. */
export type InCombatResolver = (entityId: EntityId) => boolean;

export type RepairFailureReason =
  | "invalid_definition"
  | "duplicate_station"
  | "duplicate_cost_definition"
  | "invalid_location_type"
  | "station_not_found"
  | "station_disabled"
  | "duplicate_transaction"
  | "item_not_found"
  | "not_repairable"
  | "item_destroyed"
  | "item_intact"
  | "item_locked"
  | "in_combat"
  | "cost_not_defined"
  | "cost_disabled"
  | "cost_overflow"
  | "wallet_not_found"
  | "insufficient_silver"
  | "invalid_durability"
  | "nothing_to_repair"
  | "transaction_failed";

export type RepairResult<T> =
  | { readonly ok: true; readonly value: T }
  | { readonly ok: false; readonly reason: RepairFailureReason };

export function repairOk<T>(value: T): RepairResult<T> {
  return { ok: true, value };
}

export function repairFail<T>(reason: RepairFailureReason): RepairResult<T> {
  return { ok: false, reason };
}

/** Single-item repair request (34_REPAIR_SYSTEM "Confirmation Flow"). */
export interface RepairRequest {
  readonly transactionId: string;
  readonly playerEntityId: EntityId;
  readonly walletId: WalletId;
  readonly stationId: string;
  readonly instanceId: ItemInstanceId;
}

/** Bulk repair request (34_REPAIR_SYSTEM "Bulk Repair"). */
export interface BulkRepairRequest {
  readonly transactionId: string;
  readonly playerEntityId: EntityId;
  readonly walletId: WalletId;
  readonly stationId: string;
}

export interface RepairPreview {
  readonly instanceId: ItemInstanceId;
  readonly itemId: string;
  readonly currentDurability: number;
  readonly maxDurability: number;
  readonly cost: number;
}

export interface RepairOutcome {
  readonly instanceId: ItemInstanceId;
  readonly itemId: string;
  readonly previousDurability: number;
  readonly newDurability: number;
  readonly silverCost: number;
  readonly newBalance: number;
}

export interface BulkRepairOutcome {
  readonly repaired: readonly RepairOutcome[];
  readonly totalCost: number;
  readonly newBalance: number;
}

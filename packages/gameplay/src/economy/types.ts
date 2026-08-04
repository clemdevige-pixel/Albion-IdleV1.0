import type { Brand, EntityId } from "@game/core";
import type { PlayerId, WalletId, CurrencyFailureReason } from "../currency/types.js";
import type { ItemInstanceId } from "../inventory/types.js";
import type { RepairFailureReason, RepairOutcome, BulkRepairOutcome } from "../repair/types.js";
import type { VendorBuyOutcome, VendorFailureReason, VendorSellOutcome } from "../vendor/types.js";

/** Unique economy transaction handle — the authoritative idempotence key. */
export type EconomyTransactionId = Brand<string, "EconomyTransactionId">;

export function asEconomyTransactionId(id: string): EconomyTransactionId {
  return id as EconomyTransactionId;
}

export type TransactionType =
  | "currency_credit"
  | "currency_debit"
  | "vendor_purchase"
  | "vendor_sale"
  | "equipment_repair"
  | "bulk_equipment_repair";

export const TRANSACTION_TYPES: readonly TransactionType[] = [
  "currency_credit",
  "currency_debit",
  "vendor_purchase",
  "vendor_sale",
  "equipment_repair",
  "bulk_equipment_repair",
];

/**
 * 35_CURRENCY_SYSTEM economic flow of a transaction: faucet creates Silver,
 * sink destroys it, transfer moves it between owners (reserved — V1 has no
 * player-to-player trading, NPC vendors are faucets/sinks).
 */
export type EconomyFlow = "faucet" | "transfer" | "sink";

/** Owning business system that applied the mutation. */
export type EconomySourceSystem = "currency" | "vendor" | "repair";

interface EconomyRequestBase {
  readonly transactionId: EconomyTransactionId;
  readonly playerId: PlayerId;
}

export interface CurrencyCreditRequest extends EconomyRequestBase {
  readonly type: "currency_credit";
  readonly walletId: WalletId;
  readonly currencyId: string;
  readonly amount: number;
  /** Acquisition source; must be recognized by the CurrencyRegistry definition. */
  readonly source: string;
}

export interface CurrencyDebitRequest extends EconomyRequestBase {
  readonly type: "currency_debit";
  readonly walletId: WalletId;
  readonly currencyId: string;
  readonly amount: number;
  /** Spending source; must be recognized by the CurrencyRegistry definition. */
  readonly source: string;
}

export interface VendorPurchaseRequest extends EconomyRequestBase {
  readonly type: "vendor_purchase";
  readonly playerEntityId: EntityId;
  readonly walletId: WalletId;
  readonly vendorId: string;
  readonly itemId: string;
  readonly quantity: number;
}

export interface VendorSaleRequest extends EconomyRequestBase {
  readonly type: "vendor_sale";
  readonly playerEntityId: EntityId;
  readonly walletId: WalletId;
  readonly vendorId: string;
  readonly itemId: string;
  readonly quantity: number;
}

export interface EquipmentRepairRequest extends EconomyRequestBase {
  readonly type: "equipment_repair";
  readonly playerEntityId: EntityId;
  readonly walletId: WalletId;
  readonly stationId: string;
  readonly instanceId: ItemInstanceId;
}

export interface BulkEquipmentRepairRequest extends EconomyRequestBase {
  readonly type: "bulk_equipment_repair";
  readonly playerEntityId: EntityId;
  readonly walletId: WalletId;
  readonly stationId: string;
}

export type EconomyTransactionRequest =
  | CurrencyCreditRequest
  | CurrencyDebitRequest
  | VendorPurchaseRequest
  | VendorSaleRequest
  | EquipmentRepairRequest
  | BulkEquipmentRepairRequest;

/**
 * Explicit failure codes: economy-level codes plus the underlying service
 * reason, namespaced so callers can tell which system rejected the request.
 */
export type EconomyErrorCode =
  | "invalid_request"
  | "already_processed"
  | `currency_${CurrencyFailureReason}`
  | `vendor_${VendorFailureReason}`
  | `repair_${RepairFailureReason}`;

/** Effects summary of an applied transaction, serializable for the journal. */
export type EconomyEffects =
  | {
      readonly type: "currency_credit";
      readonly currencyId: string;
      readonly amount: number;
      readonly newBalance: number;
    }
  | {
      readonly type: "currency_debit";
      readonly currencyId: string;
      readonly amount: number;
      readonly newBalance: number;
    }
  | { readonly type: "vendor_purchase"; readonly outcome: VendorBuyOutcome }
  | { readonly type: "vendor_sale"; readonly outcome: VendorSellOutcome }
  | { readonly type: "equipment_repair"; readonly outcome: RepairOutcome }
  | { readonly type: "bulk_equipment_repair"; readonly outcome: BulkRepairOutcome };

export type TransactionStatus = "completed" | "failed";

export const TRANSACTION_STATUSES: readonly TransactionStatus[] = ["completed", "failed"];

/**
 * Journal entry. Ordering is purely logical: the monotonic sequence number is
 * the only order — no wall-clock, so replays are deterministic.
 */
export interface EconomyTransactionRecord {
  readonly sequence: number;
  readonly transactionId: EconomyTransactionId;
  readonly playerId: PlayerId;
  readonly type: TransactionType;
  readonly status: TransactionStatus;
  readonly sourceSystem: EconomySourceSystem;
  readonly flow: EconomyFlow | null;
  readonly currencyId: string | null;
  readonly amount: number | null;
  readonly affectedEntities: readonly string[];
  readonly errorCode: EconomyErrorCode | null;
  readonly effects: EconomyEffects | null;
}

export type EconomyTransactionResult =
  | {
      readonly ok: true;
      readonly record: EconomyTransactionRecord;
      readonly effects: EconomyEffects;
      /** True when this call returned the stored result of an earlier run. */
      readonly replayed: boolean;
    }
  | {
      readonly ok: false;
      readonly code: EconomyErrorCode;
      readonly record: EconomyTransactionRecord | null;
    };

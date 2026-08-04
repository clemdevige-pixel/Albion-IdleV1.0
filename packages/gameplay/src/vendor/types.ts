import type { EntityId } from "@game/core";
import type { WalletId } from "../currency/types.js";

/** 36_VENDOR_SYSTEM "Currency Integration": all vendor transactions use Silver. */
export const VENDOR_CURRENCY_ID = "currency_silver";

/** 35_CURRENCY_SYSTEM spending source used when the player buys from an NPC. */
export const VENDOR_SPEND_SOURCE = "Vendor";

/** 35_CURRENCY_SYSTEM acquisition source used when the player sells to an NPC. */
export const VENDOR_SALE_SOURCE = "VendorSale";

/**
 * 36_VENDOR_SYSTEM "Vendor Roles", named from the vendor's perspective:
 * `sell_only` vendors sell to the player (player buys), `buy_only` vendors buy
 * from the player (player sells).
 */
export type VendorRole = "buy_only" | "sell_only" | "buy_and_sell" | "service_only";

export const VENDOR_ROLES: readonly VendorRole[] = [
  "buy_only",
  "sell_only",
  "buy_and_sell",
  "service_only",
];

export function roleAllowsPlayerBuy(role: VendorRole): boolean {
  return role === "sell_only" || role === "buy_and_sell";
}

export function roleAllowsPlayerSell(role: VendorRole): boolean {
  return role === "buy_only" || role === "buy_and_sell";
}

/**
 * Fixed-price catalogue entry mirrored from data (36_VENDOR_DATA). Kept
 * structural so gameplay stays decoupled from @game/data.
 */
export interface VendorOfferLike {
  readonly itemId: string;
  /** Silver the player pays per unit; null when the vendor does not sell it. */
  readonly buyPrice: number | null;
  /** Silver the player receives per unit; null when the vendor does not buy it. */
  readonly sellPrice: number | null;
  /** Per-transaction quantity cap; null means unbounded (stock is unlimited in V1). */
  readonly maxPerTransaction: number | null;
  readonly enabled: boolean;
}

export interface VendorDefinitionLike {
  readonly vendorId: string;
  readonly role: VendorRole;
  readonly enabled: boolean;
  readonly offers: readonly VendorOfferLike[];
}

export type VendorFailureReason =
  | "duplicate_vendor"
  | "invalid_definition"
  | "invalid_role"
  | "arbitrage_configuration"
  | "vendor_not_found"
  | "vendor_disabled"
  | "operation_not_supported"
  | "offer_not_found"
  | "offer_disabled"
  | "price_not_defined"
  | "invalid_quantity"
  | "quantity_limit_exceeded"
  | "price_overflow"
  | "wallet_not_found"
  | "insufficient_silver"
  | "insufficient_capacity"
  | "insufficient_item_quantity"
  | "item_equipped"
  | "item_locked"
  | "transaction_failed";

export type VendorResult<T> =
  | { readonly ok: true; readonly value: T }
  | { readonly ok: false; readonly reason: VendorFailureReason };

export function vendorOk<T>(value: T): VendorResult<T> {
  return { ok: true, value };
}

export function vendorFail<T>(reason: VendorFailureReason): VendorResult<T> {
  return { ok: false, reason };
}

/** Player buy/sell request (36_VENDOR_SYSTEM "Purchase Flow" / "Sell Flow"). */
export interface VendorTransactionRequest {
  readonly playerEntityId: EntityId;
  readonly walletId: WalletId;
  readonly vendorId: string;
  readonly itemId: string;
  readonly quantity: number;
}

export interface VendorBuyOutcome {
  readonly itemId: string;
  readonly quantity: number;
  readonly totalPrice: number;
  readonly newBalance: number;
}

export interface VendorSellOutcome {
  readonly itemId: string;
  readonly quantity: number;
  readonly totalProceeds: number;
  readonly newBalance: number;
}

/**
 * 36_VENDOR_SYSTEM "Sell Transaction": items locked or reserved by another
 * system cannot be sold. Lock state is owned elsewhere, so it is injected.
 */
export type ItemLockResolver = (entityId: EntityId, itemId: string) => boolean;

/**
 * Structural view of the EquipmentManager (36_VENDOR_SYSTEM: equipped items
 * cannot be sold).
 */
export interface EquippedItemsSourceLike {
  getEquipped(entityId: EntityId): ReadonlyMap<unknown, { readonly itemId: string }>;
}

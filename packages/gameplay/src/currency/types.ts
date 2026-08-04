import type { Brand } from "@game/core";

/** Persistent wallet handle (35_CURRENCY_SYSTEM "Save Data": WalletID). */
export type WalletId = Brand<string, "WalletId">;

/** Owner of a wallet (35_CURRENCY_SYSTEM: each player owns exactly one wallet). */
export type PlayerId = Brand<string, "PlayerId">;

export function asWalletId(id: string): WalletId {
  return id as WalletId;
}

export function asPlayerId(id: string): PlayerId {
  return id as PlayerId;
}

/**
 * Immutable currency definition mirrored from data (39_CURRENCY_DATA). Kept
 * structural so gameplay stays decoupled from @game/data, matching the
 * resolver pattern used by inventory.
 */
export interface CurrencyDefinitionLike {
  readonly id: string;
  readonly enabled: boolean;
  /** 39_CURRENCY_DATA: balances may never go below this (always 0 in V1). */
  readonly minValue: number;
  /** Overflow protection cap; null means engine-safe maximum. */
  readonly maxValue: number | null;
  /** Allowed earn sources; undefined means unrestricted (39_CURRENCY_DATA). */
  readonly acquisitionSources?: readonly string[];
  /** Allowed spend sources; undefined means unrestricted (39_CURRENCY_DATA). */
  readonly spendingSources?: readonly string[];
}

/** 39_CURRENCY_DATA "Maximum Value": null caps at the engine-safe integer. */
export function effectiveMaxValue(definition: CurrencyDefinitionLike): number {
  return definition.maxValue ?? Number.MAX_SAFE_INTEGER;
}

export type CurrencyFailureReason =
  | "wallet_not_found"
  | "wallet_already_exists"
  | "player_already_has_wallet"
  | "unknown_currency"
  | "currency_disabled"
  | "duplicate_currency"
  | "invalid_definition"
  | "invalid_amount"
  | "insufficient_balance"
  | "max_cap_exceeded"
  | "source_not_allowed";

export type CurrencyResult<T> =
  | { readonly ok: true; readonly value: T }
  | { readonly ok: false; readonly reason: CurrencyFailureReason };

export function currencyOk<T>(value: T): CurrencyResult<T> {
  return { ok: true, value };
}

export function currencyFail<T>(reason: CurrencyFailureReason): CurrencyResult<T> {
  return { ok: false, reason };
}

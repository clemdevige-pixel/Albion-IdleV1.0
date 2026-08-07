import type { CurrencyRegistry } from "./currency-registry.js";
import {
  type CurrencyDefinitionLike,
  type CurrencyResult,
  type PlayerId,
  type WalletId,
  currencyOk,
  currencyFail,
  effectiveMaxValue,
} from "./types.js";

/**
 * Runtime wallet state (35_CURRENCY_SYSTEM "Wallet System"): balances live
 * outside inventory/equipment/bank and belong to account progression.
 */
export interface WalletData {
  readonly walletId: WalletId;
  readonly playerId: PlayerId;
  readonly balances: Map<string, number>;
}

/**
 * CurrencyService + WalletService responsibilities from 35_CURRENCY_SYSTEM:
 * every operation is atomic and deterministic — on any validation failure
 * nothing changes.
 */
export class CurrencyService {
  private readonly wallets = new Map<WalletId, WalletData>();
  private readonly walletByPlayer = new Map<PlayerId, WalletId>();

  constructor(private readonly registry: CurrencyRegistry) {}

  createWallet(walletId: WalletId, playerId: PlayerId): CurrencyResult<WalletId> {
    if (this.wallets.has(walletId)) {
      return currencyFail("wallet_already_exists");
    }
    if (this.walletByPlayer.has(playerId)) {
      return currencyFail("player_already_has_wallet");
    }
    this.wallets.set(walletId, { walletId, playerId, balances: new Map() });
    this.walletByPlayer.set(playerId, walletId);
    return currencyOk(walletId);
  }

  hasWallet(walletId: WalletId): boolean {
    return this.wallets.has(walletId);
  }

  getWalletForPlayer(playerId: PlayerId): WalletId | undefined {
    return this.walletByPlayer.get(playerId);
  }

  listWallets(): readonly WalletId[] {
    return [...this.wallets.keys()];
  }

  getBalance(walletId: WalletId, currencyId: string): CurrencyResult<number> {
    const wallet = this.wallets.get(walletId);
    if (wallet === undefined) {
      return currencyFail("wallet_not_found");
    }
    if (!this.registry.has(currencyId)) {
      return currencyFail("unknown_currency");
    }
    return currencyOk(wallet.balances.get(currencyId) ?? 0);
  }

  credit(
    walletId: WalletId,
    currencyId: string,
    amount: number,
    source?: string,
  ): CurrencyResult<number> {
    const validated = this.validateOperation(walletId, currencyId, amount);
    if (!validated.ok) {
      return validated;
    }
    const { wallet, definition, balance } = validated.value;
    if (!isSourceAllowed(source, definition.acquisitionSources)) {
      return currencyFail("source_not_allowed");
    }
    const next = balance + amount;
    if (next > effectiveMaxValue(definition)) {
      return currencyFail("max_cap_exceeded");
    }
    wallet.balances.set(currencyId, next);
    return currencyOk(next);
  }

  canSpend(walletId: WalletId, currencyId: string, amount: number): CurrencyResult<number> {
    const validated = this.validateOperation(walletId, currencyId, amount);
    if (!validated.ok) {
      return validated;
    }
    const { definition, balance } = validated.value;
    const next = balance - amount;
    if (next < definition.minValue) {
      return currencyFail("insufficient_balance");
    }
    return currencyOk(next);
  }

  debit(
    walletId: WalletId,
    currencyId: string,
    amount: number,
    source?: string,
  ): CurrencyResult<number> {
    const validated = this.validateOperation(walletId, currencyId, amount);
    if (!validated.ok) {
      return validated;
    }
    const { wallet, definition, balance } = validated.value;
    if (!isSourceAllowed(source, definition.spendingSources)) {
      return currencyFail("source_not_allowed");
    }
    const next = balance - amount;
    if (next < definition.minValue) {
      return currencyFail("insufficient_balance");
    }
    wallet.balances.set(currencyId, next);
    return currencyOk(next);
  }

  /**
   * Restores a persisted wallet with exact balances. Internal to the save
   * pipeline — never creates, loses, or duplicates currency (37_SAVE_SYSTEM).
   */
  _restore(
    walletId: WalletId,
    playerId: PlayerId,
    balances: ReadonlyMap<string, number>,
  ): CurrencyResult<WalletId> {
    for (const [currencyId, balance] of balances) {
      const definition = this.registry.get(currencyId);
      if (definition === undefined) {
        return currencyFail("unknown_currency");
      }
      if (!Number.isSafeInteger(balance) || balance < definition.minValue) {
        return currencyFail("invalid_amount");
      }
      if (balance > effectiveMaxValue(definition)) {
        return currencyFail("max_cap_exceeded");
      }
    }
    if (!this.wallets.has(walletId)) {
      const created = this.createWallet(walletId, playerId);
      if (!created.ok) {
        return created;
      }
    }
    const wallet = this.wallets.get(walletId);
    if (wallet !== undefined) {
      wallet.balances.clear();
      for (const [currencyId, balance] of balances) {
        wallet.balances.set(currencyId, balance);
      }
    }
    return currencyOk(walletId);
  }

  /** Snapshot for persistence; sorted for deterministic output. */
  _snapshot(walletId: WalletId): WalletData | undefined {
    return this.wallets.get(walletId);
  }

  private validateOperation(
    walletId: WalletId,
    currencyId: string,
    amount: number,
  ): CurrencyResult<{
    wallet: WalletData;
    definition: CurrencyDefinitionLike;
    balance: number;
  }> {
    const wallet = this.wallets.get(walletId);
    if (wallet === undefined) {
      return currencyFail("wallet_not_found");
    }
    const definition = this.registry.get(currencyId);
    if (definition === undefined) {
      return currencyFail("unknown_currency");
    }
    if (!definition.enabled) {
      return currencyFail("currency_disabled");
    }
    if (!Number.isSafeInteger(amount) || amount <= 0) {
      return currencyFail("invalid_amount");
    }
    return currencyOk({ wallet, definition, balance: wallet.balances.get(currencyId) ?? 0 });
  }
}

function isSourceAllowed(
  source: string | undefined,
  allowed: readonly string[] | undefined,
): boolean {
  if (source === undefined || allowed === undefined) {
    return true;
  }
  return allowed.includes(source);
}

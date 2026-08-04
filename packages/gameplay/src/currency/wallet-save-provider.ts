import type { SaveProvider } from "@game/persistence";
import type { CurrencyService } from "./currency-service.js";
import { asPlayerId, asWalletId } from "./types.js";

interface SavedBalance {
  currencyId: string;
  balance: number;
}

interface SavedWallet {
  walletId: string;
  playerId: string;
  balances: SavedBalance[];
}

interface WalletSavePayload {
  wallets: SavedWallet[];
}

export class WalletSaveProvider implements SaveProvider {
  readonly providerId = "wallet";

  constructor(private readonly service: CurrencyService) {}

  save(): unknown {
    const wallets: SavedWallet[] = [];
    for (const walletId of this.service.listWallets()) {
      const wallet = this.service._snapshot(walletId);
      if (wallet === undefined) {
        continue;
      }
      const balances: SavedBalance[] = [];
      for (const [currencyId, balance] of wallet.balances) {
        balances.push({ currencyId, balance });
      }
      balances.sort((a, b) => a.currencyId.localeCompare(b.currencyId));
      wallets.push({ walletId: wallet.walletId, playerId: wallet.playerId, balances });
    }
    wallets.sort((a, b) => a.walletId.localeCompare(b.walletId));
    return { wallets } satisfies WalletSavePayload;
  }

  load(data: unknown): void {
    const payload = data as WalletSavePayload;
    for (const saved of payload.wallets) {
      const balances = new Map<string, number>();
      for (const entry of saved.balances) {
        if (balances.has(entry.currencyId)) {
          throw new Error(
            `Invalid wallet save data: duplicate currency ${entry.currencyId} in wallet ${saved.walletId}`,
          );
        }
        balances.set(entry.currencyId, entry.balance);
      }
      const restored = this.service._restore(
        asWalletId(saved.walletId),
        asPlayerId(saved.playerId),
        balances,
      );
      if (!restored.ok) {
        throw new Error(
          `Invalid wallet save data: ${restored.reason} in wallet ${saved.walletId}`,
        );
      }
    }
  }
}

import type { SaveProvider } from "@game/persistence";

interface ExpeditionRewardLedgerSnapshot {
  readonly version: 1;
  readonly lifetimeSilverCredited: number;
}

function isExpeditionRewardLedgerSnapshot(
  data: unknown,
): data is ExpeditionRewardLedgerSnapshot {
  if (data === null || typeof data !== "object") return false;
  const snapshot = data as Record<string, unknown>;
  return snapshot.version === 1
    && Number.isSafeInteger(snapshot.lifetimeSilverCredited)
    && Number(snapshot.lifetimeSilverCredited) >= 0;
}

/**
 * Persists reward totals that cannot be reconstructed from current balance
 * tables after tuning changes. Completion counts remain owned by
 * ExpeditionService; this ledger owns only actually credited reward totals.
 */
export class ExpeditionRewardLedger implements SaveProvider {
  readonly providerId = "expedition_reward_ledger";

  #lifetimeSilverCredited = 0;

  getLifetimeSilverCredited(): number {
    return this.#lifetimeSilverCredited;
  }

  recordSilverCredited(amount: number): void {
    if (!Number.isSafeInteger(amount) || amount <= 0) {
      throw new Error("Expedition Silver credit must be a positive safe integer");
    }
    this.#lifetimeSilverCredited += amount;
  }

  save(): ExpeditionRewardLedgerSnapshot {
    return {
      version: 1,
      lifetimeSilverCredited: this.#lifetimeSilverCredited,
    };
  }

  load(data: unknown): void {
    this.#lifetimeSilverCredited = isExpeditionRewardLedgerSnapshot(data)
      ? data.lifetimeSilverCredited
      : 0;
  }
}

import type { SaveProvider } from "@game/persistence";
import { z } from "zod";

const ExpeditionRewardLedgerSnapshotSchema = z.object({
  version: z.literal(1),
  lifetimeSilverCredited: z.number().int().nonnegative(),
});

type ExpeditionRewardLedgerSnapshot = z.infer<typeof ExpeditionRewardLedgerSnapshotSchema>;

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
    const parsed = ExpeditionRewardLedgerSnapshotSchema.safeParse(data);
    this.#lifetimeSilverCredited = parsed.success
      ? parsed.data.lifetimeSilverCredited
      : 0;
  }
}

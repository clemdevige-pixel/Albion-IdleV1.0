import type { SaveProvider } from "@game/persistence";
import type { TransactionRegistry } from "./transaction-registry.js";
import type { EconomyTransactionRecord } from "./types.js";

interface TransactionJournalSavePayload {
  records: EconomyTransactionRecord[];
  nextSequence: number;
}

/**
 * Persists the economy journal (records + processed transaction ids) so a
 * completed transaction is never replayed after load. Snapshot consistency by
 * construction (37_SAVE_SYSTEM): this provider is saved by the same
 * SaveManager pass as the wallet/inventory/durability providers, so the
 * journal snapshot always travels with the state it describes — a transaction
 * is either fully present in the whole snapshot or absent from all of it.
 */
export class TransactionJournalSaveProvider implements SaveProvider {
  readonly providerId = "transaction_journal";

  constructor(private readonly journal: TransactionRegistry) {}

  save(): unknown {
    const snapshot = this.journal._snapshot();
    return {
      records: snapshot.records.map((record) => ({ ...record })),
      nextSequence: snapshot.nextSequence,
    } satisfies TransactionJournalSavePayload;
  }

  load(data: unknown): void {
    if (typeof data !== "object" || data === null) {
      throw new Error("Invalid transaction journal save data: payload is not an object");
    }
    const payload = data as Partial<TransactionJournalSavePayload>;
    if (!Array.isArray(payload.records) || typeof payload.nextSequence !== "number") {
      throw new Error("Invalid transaction journal save data: missing records or nextSequence");
    }
    this.journal._restore(payload.records, payload.nextSequence);
  }
}

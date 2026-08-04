import {
  TRANSACTION_STATUSES,
  TRANSACTION_TYPES,
  type EconomyTransactionId,
  type EconomyTransactionRecord,
} from "./types.js";

/**
 * Economy transaction journal (37_SAVE_SYSTEM traceability). Records both
 * completed and failed attempts in deterministic logical order. Only a
 * COMPLETED transaction id blocks replay — a failed attempt may be retried
 * under the same id.
 */
export class TransactionRegistry {
  private readonly records: EconomyTransactionRecord[] = [];
  private readonly completedById = new Map<EconomyTransactionId, EconomyTransactionRecord>();
  private nextSequence = 1;

  /** True when the transaction id has a completed record (replay must be blocked). */
  has(transactionId: EconomyTransactionId): boolean {
    return this.completedById.has(transactionId);
  }

  /** Completed record for the id, if any. */
  get(transactionId: EconomyTransactionId): EconomyTransactionRecord | undefined {
    return this.completedById.get(transactionId);
  }

  /** All records, completed and failed, in sequence order. */
  getRecords(): readonly EconomyTransactionRecord[] {
    return this.records;
  }

  append(
    input: Omit<EconomyTransactionRecord, "sequence">,
  ): EconomyTransactionRecord {
    if (input.status === "completed" && this.completedById.has(input.transactionId)) {
      throw new Error(
        `Transaction journal corruption: duplicate completed transaction ${input.transactionId}`,
      );
    }
    const record: EconomyTransactionRecord = Object.freeze({
      ...input,
      sequence: this.nextSequence,
    });
    this.nextSequence += 1;
    this.records.push(record);
    if (record.status === "completed") {
      this.completedById.set(record.transactionId, record);
    }
    return record;
  }

  _snapshot(): { records: readonly EconomyTransactionRecord[]; nextSequence: number } {
    return { records: this.records, nextSequence: this.nextSequence };
  }

  /** Restores a persisted journal; rejects partial or corrupt entries. */
  _restore(records: readonly EconomyTransactionRecord[], nextSequence: number): void {
    if (this.records.length > 0) {
      throw new Error("Transaction journal already contains records; cannot restore over them");
    }
    if (!Number.isSafeInteger(nextSequence) || nextSequence < 1) {
      throw new Error("Invalid transaction journal save data: bad nextSequence");
    }
    let previousSequence = 0;
    for (const record of records) {
      validateRecord(record);
      if (record.sequence <= previousSequence) {
        throw new Error(
          `Invalid transaction journal save data: non-monotonic sequence ${record.sequence}`,
        );
      }
      if (record.sequence >= nextSequence) {
        throw new Error(
          `Invalid transaction journal save data: sequence ${record.sequence} beyond nextSequence`,
        );
      }
      if (record.status === "completed" && this.completedById.has(record.transactionId)) {
        throw new Error(
          `Invalid transaction journal save data: duplicate completed transaction ${record.transactionId}`,
        );
      }
      previousSequence = record.sequence;
      const frozen = Object.freeze({ ...record });
      this.records.push(frozen);
      if (frozen.status === "completed") {
        this.completedById.set(frozen.transactionId, frozen);
      }
    }
    this.nextSequence = nextSequence;
  }
}

function validateRecord(record: EconomyTransactionRecord): void {
  const fail = (detail: string): never => {
    throw new Error(`Invalid transaction journal save data: ${detail}`);
  };
  if (typeof record.transactionId !== "string" || record.transactionId.length === 0) {
    fail("missing transactionId");
  }
  if (typeof record.playerId !== "string" || record.playerId.length === 0) {
    fail(`missing playerId for ${record.transactionId}`);
  }
  if (!TRANSACTION_TYPES.includes(record.type)) {
    fail(`unknown type for ${record.transactionId}`);
  }
  if (!TRANSACTION_STATUSES.includes(record.status)) {
    fail(`unknown status for ${record.transactionId}`);
  }
  if (!Number.isSafeInteger(record.sequence) || record.sequence < 1) {
    fail(`invalid sequence for ${record.transactionId}`);
  }
  if (record.status === "completed" && record.effects === null) {
    fail(`completed record without effects for ${record.transactionId}`);
  }
  if (record.status === "failed" && record.errorCode === null) {
    fail(`failed record without errorCode for ${record.transactionId}`);
  }
}

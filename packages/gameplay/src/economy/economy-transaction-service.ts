import type { CurrencyRegistry } from "../currency/currency-registry.js";
import type { CurrencyService } from "../currency/currency-service.js";
import type { RepairService } from "../repair/repair-service.js";
import type { VendorService } from "../vendor/vendor-service.js";
import type { EconomyEventEmitter } from "./economy-events.js";
import type { TransactionRegistry } from "./transaction-registry.js";
import type {
  CurrencyCreditRequest,
  CurrencyDebitRequest,
  EconomyEffects,
  EconomyErrorCode,
  EconomyFlow,
  EconomySourceSystem,
  EconomyTransactionRecord,
  EconomyTransactionRequest,
  EconomyTransactionResult,
} from "./types.js";

interface AppliedTransaction {
  readonly effects: EconomyEffects;
  readonly currencyId: string;
  readonly amount: number;
  readonly affectedEntities: readonly string[];
}

/**
 * Phase 7.4 economy transaction runtime. Single pipeline for every economic
 * operation: validate format → authorize source/sink → idempotence gate →
 * delegate the atomic mutation to the owning business service → journal →
 * publish events. Business rules stay in Currency/Vendor/Repair — this layer
 * only orchestrates their public APIs and never mutates state itself, so
 * atomicity of the mutation is exactly the atomicity those services already
 * guarantee, and a rejection at any pipeline step leaves all state untouched.
 */
export class EconomyTransactionService {
  constructor(
    private readonly currencyRegistry: CurrencyRegistry,
    private readonly currencyService: CurrencyService,
    private readonly vendorService: VendorService,
    private readonly repairService: RepairService,
    private readonly journal: TransactionRegistry,
    private readonly events: EconomyEventEmitter,
  ) {}

  execute(request: EconomyTransactionRequest): EconomyTransactionResult {
    // Format-invalid requests are rejected without journaling: their ids may
    // be empty or unusable, and journaling them would produce records that
    // TransactionRegistry._restore rejects, permanently corrupting the save.
    const formatError = this.validateFormat(request);
    if (formatError !== null) {
      return { ok: false, code: formatError, record: null };
    }

    // Idempotence gate: a completed transaction id is authoritative here and
    // never reaches the underlying services again.
    const previous = this.journal.get(request.transactionId);
    if (previous !== undefined) {
      if (previous.effects === null) {
        return { ok: false, code: "already_processed", record: previous };
      }
      return { ok: true, record: previous, effects: previous.effects, replayed: true };
    }

    const authError = this.authorize(request);
    if (authError !== null) {
      return this.reject(request, authError);
    }

    const applied = this.apply(request);
    if (!applied.ok) {
      return this.reject(request, applied.code);
    }

    const record = this.journal.append({
      transactionId: request.transactionId,
      playerId: request.playerId,
      type: request.type,
      status: "completed",
      sourceSystem: sourceSystemOf(request.type),
      flow: flowOf(request.type),
      currencyId: applied.value.currencyId,
      amount: applied.value.amount,
      affectedEntities: applied.value.affectedEntities,
      errorCode: null,
      effects: applied.value.effects,
    });
    this.publishSuccess(record, applied.value.effects);
    return { ok: true, record, effects: applied.value.effects, replayed: false };
  }

  private validateFormat(request: EconomyTransactionRequest): EconomyErrorCode | null {
    if (!isNonEmptyString(request.transactionId) || !isNonEmptyString(request.playerId)) {
      return "invalid_request";
    }
    switch (request.type) {
      case "currency_credit":
      case "currency_debit":
        if (
          !isNonEmptyString(request.walletId) ||
          !isNonEmptyString(request.currencyId) ||
          !isNonEmptyString(request.source) ||
          typeof request.amount !== "number" ||
          !Number.isFinite(request.amount)
        ) {
          return "invalid_request";
        }
        return null;
      case "vendor_purchase":
      case "vendor_sale":
        if (
          !isNonEmptyString(request.walletId) ||
          !isNonEmptyString(request.vendorId) ||
          !isNonEmptyString(request.itemId) ||
          typeof request.quantity !== "number" ||
          !Number.isFinite(request.quantity)
        ) {
          return "invalid_request";
        }
        return null;
      case "equipment_repair":
        if (
          !isNonEmptyString(request.walletId) ||
          !isNonEmptyString(request.stationId) ||
          !isNonEmptyString(request.instanceId)
        ) {
          return "invalid_request";
        }
        return null;
      case "bulk_equipment_repair":
        if (!isNonEmptyString(request.walletId) || !isNonEmptyString(request.stationId)) {
          return "invalid_request";
        }
        return null;
    }
  }

  /**
   * Source/sink authorization against CurrencyRegistry definitions, before any
   * mutation. Vendor and repair operations use sources fixed by their own
   * systems, which the services validate themselves on debit/credit.
   */
  private authorize(request: EconomyTransactionRequest): EconomyErrorCode | null {
    if (request.type !== "currency_credit" && request.type !== "currency_debit") {
      return null;
    }
    const definition = this.currencyRegistry.get(request.currencyId);
    if (definition === undefined) {
      return "currency_unknown_currency";
    }
    const allowed =
      request.type === "currency_credit"
        ? definition.acquisitionSources
        : definition.spendingSources;
    if (allowed !== undefined && !allowed.includes(request.source)) {
      return "currency_source_not_allowed";
    }
    return null;
  }

  private apply(
    request: EconomyTransactionRequest,
  ):
    | { readonly ok: true; readonly value: AppliedTransaction }
    | { readonly ok: false; readonly code: EconomyErrorCode } {
    switch (request.type) {
      case "currency_credit":
        return this.applyCurrency(request);
      case "currency_debit":
        return this.applyCurrency(request);
      case "vendor_purchase": {
        const result = this.vendorService.buyFromVendor(request);
        if (!result.ok) {
          return { ok: false, code: `vendor_${result.reason}` };
        }
        return {
          ok: true,
          value: {
            effects: { type: "vendor_purchase", outcome: result.value },
            currencyId: "currency_silver",
            amount: result.value.totalPrice,
            affectedEntities: [request.walletId, request.vendorId, request.itemId],
          },
        };
      }
      case "vendor_sale": {
        const result = this.vendorService.sellToVendor(request);
        if (!result.ok) {
          return { ok: false, code: `vendor_${result.reason}` };
        }
        return {
          ok: true,
          value: {
            effects: { type: "vendor_sale", outcome: result.value },
            currencyId: "currency_silver",
            amount: result.value.totalProceeds,
            affectedEntities: [request.walletId, request.vendorId, request.itemId],
          },
        };
      }
      case "equipment_repair": {
        const result = this.repairService.repair(request);
        if (!result.ok) {
          return { ok: false, code: `repair_${result.reason}` };
        }
        return {
          ok: true,
          value: {
            effects: { type: "equipment_repair", outcome: result.value },
            currencyId: "currency_silver",
            amount: result.value.silverCost,
            affectedEntities: [request.walletId, request.stationId, request.instanceId],
          },
        };
      }
      case "bulk_equipment_repair": {
        const result = this.repairService.bulkRepair(request);
        if (!result.ok) {
          return { ok: false, code: `repair_${result.reason}` };
        }
        return {
          ok: true,
          value: {
            effects: { type: "bulk_equipment_repair", outcome: result.value },
            currencyId: "currency_silver",
            amount: result.value.totalCost,
            affectedEntities: [
              request.walletId,
              request.stationId,
              ...result.value.repaired.map((entry) => entry.instanceId as string),
            ],
          },
        };
      }
    }
  }

  private applyCurrency(
    request: CurrencyCreditRequest | CurrencyDebitRequest,
  ):
    | { readonly ok: true; readonly value: AppliedTransaction }
    | { readonly ok: false; readonly code: EconomyErrorCode } {
    const result =
      request.type === "currency_credit"
        ? this.currencyService.credit(
            request.walletId,
            request.currencyId,
            request.amount,
            request.source,
          )
        : this.currencyService.debit(
            request.walletId,
            request.currencyId,
            request.amount,
            request.source,
          );
    if (!result.ok) {
      return { ok: false, code: `currency_${result.reason}` };
    }
    return {
      ok: true,
      value: {
        effects: {
          type: request.type,
          currencyId: request.currencyId,
          amount: request.amount,
          newBalance: result.value,
        },
        currencyId: request.currencyId,
        amount: request.amount,
        affectedEntities: [request.walletId],
      },
    };
  }

  /** Failures are journalized too, then only `transaction_rejected` is published. */
  private reject(
    request: EconomyTransactionRequest,
    code: EconomyErrorCode,
  ): EconomyTransactionResult {
    const record = this.journal.append({
      transactionId: request.transactionId,
      playerId: request.playerId,
      type: request.type,
      status: "failed",
      sourceSystem: sourceSystemOf(request.type),
      flow: flowOf(request.type),
      currencyId: null,
      amount: null,
      affectedEntities: [],
      errorCode: code,
      effects: null,
    });
    this.events.emit("transaction_rejected", { record });
    return { ok: false, code, record };
  }

  private publishSuccess(record: EconomyTransactionRecord, effects: EconomyEffects): void {
    this.events.emit("transaction_completed", { record });
    switch (effects.type) {
      case "currency_credit":
        this.events.emit("currency_credited", {
          record,
          currencyId: effects.currencyId,
          amount: effects.amount,
          newBalance: effects.newBalance,
        });
        break;
      case "currency_debit":
        this.events.emit("currency_debited", {
          record,
          currencyId: effects.currencyId,
          amount: effects.amount,
          newBalance: effects.newBalance,
        });
        break;
      case "vendor_purchase":
      case "vendor_sale":
        this.events.emit("vendor_transaction_completed", { record, effects });
        break;
      case "equipment_repair":
      case "bulk_equipment_repair":
        this.events.emit("repair_transaction_completed", { record, effects });
        break;
    }
  }
}

function sourceSystemOf(type: EconomyTransactionRequest["type"]): EconomySourceSystem {
  switch (type) {
    case "currency_credit":
    case "currency_debit":
      return "currency";
    case "vendor_purchase":
    case "vendor_sale":
      return "vendor";
    case "equipment_repair":
    case "bulk_equipment_repair":
      return "repair";
  }
}

/**
 * 35_CURRENCY_SYSTEM: credits and vendor sales create Silver (faucet); debits,
 * vendor purchases and repairs destroy it (sink). NPC vendors are not
 * transfers — no player-to-player economy exists in V1.
 */
function flowOf(type: EconomyTransactionRequest["type"]): EconomyFlow {
  switch (type) {
    case "currency_credit":
    case "vendor_sale":
      return "faucet";
    case "currency_debit":
    case "vendor_purchase":
    case "equipment_repair":
    case "bulk_equipment_repair":
      return "sink";
  }
}

function isNonEmptyString(value: unknown): boolean {
  return typeof value === "string" && value.length > 0;
}

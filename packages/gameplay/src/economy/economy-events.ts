import type { EconomyEffects, EconomyTransactionRecord } from "./types.js";

/**
 * Economy-only event map. Events are published exclusively after a definitive
 * outcome — a listener never observes an operation that was later cancelled.
 */
export interface EconomyEventMap {
  transaction_completed: { readonly record: EconomyTransactionRecord };
  transaction_rejected: { readonly record: EconomyTransactionRecord };
  currency_credited: {
    readonly record: EconomyTransactionRecord;
    readonly currencyId: string;
    readonly amount: number;
    readonly newBalance: number;
  };
  currency_debited: {
    readonly record: EconomyTransactionRecord;
    readonly currencyId: string;
    readonly amount: number;
    readonly newBalance: number;
  };
  vendor_transaction_completed: {
    readonly record: EconomyTransactionRecord;
    readonly effects: EconomyEffects;
  };
  repair_transaction_completed: {
    readonly record: EconomyTransactionRecord;
    readonly effects: EconomyEffects;
  };
}

export type EconomyEventName = keyof EconomyEventMap;

type EconomyListener<K extends EconomyEventName> = (payload: EconomyEventMap[K]) => void;

/** Minimal typed pub/sub, deliberately not wired to any UI or core runtime bus. */
export class EconomyEventEmitter {
  private readonly listeners = new Map<EconomyEventName, Set<EconomyListener<EconomyEventName>>>();

  on<K extends EconomyEventName>(event: K, listener: EconomyListener<K>): () => void {
    let set = this.listeners.get(event);
    if (set === undefined) {
      set = new Set();
      this.listeners.set(event, set);
    }
    const stored = listener as EconomyListener<EconomyEventName>;
    set.add(stored);
    return () => {
      set.delete(stored);
    };
  }

  emit<K extends EconomyEventName>(event: K, payload: EconomyEventMap[K]): void {
    const set = this.listeners.get(event);
    if (set === undefined) {
      return;
    }
    for (const listener of [...set]) {
      listener(payload);
    }
  }
}

/**
 * Minimal typed event bus.
 *
 * Generic over an event map `TEvents` (event name → payload type). Purely
 * synchronous: handlers run in subscription order when an event is published.
 * The engine never relies on subscriber order for internal correctness.
 */
export type EventHandler<TPayload> = (payload: TPayload) => void;

export interface Unsubscribe {
  (): void;
}

export class EventBus<TEvents extends object> {
  readonly #handlers = new Map<keyof TEvents, Set<EventHandler<unknown>>>();

  /** Subscribes to `event`; returns a function that unsubscribes the handler. */
  subscribe<K extends keyof TEvents>(event: K, handler: EventHandler<TEvents[K]>): Unsubscribe {
    const set = this.#handlers.get(event) ?? new Set<EventHandler<unknown>>();
    set.add(handler as EventHandler<unknown>);
    this.#handlers.set(event, set);
    return () => this.unsubscribe(event, handler);
  }

  /** Subscribes to `event` for a single delivery, then auto-unsubscribes. */
  once<K extends keyof TEvents>(event: K, handler: EventHandler<TEvents[K]>): Unsubscribe {
    const off = this.subscribe(event, (payload) => {
      off();
      handler(payload);
    });
    return off;
  }

  /** Removes a previously registered handler. */
  unsubscribe<K extends keyof TEvents>(event: K, handler: EventHandler<TEvents[K]>): void {
    const set = this.#handlers.get(event);
    if (set === undefined) {
      return;
    }
    set.delete(handler as EventHandler<unknown>);
    if (set.size === 0) {
      this.#handlers.delete(event);
    }
  }

  /** Publishes `payload` to all handlers of `event`, in subscription order. */
  publish<K extends keyof TEvents>(event: K, payload: TEvents[K]): void {
    const set = this.#handlers.get(event);
    if (set === undefined) {
      return;
    }
    // Snapshot so handlers may (un)subscribe during dispatch without surprises.
    for (const handler of [...set]) {
      handler(payload);
    }
  }

  /** Removes every handler for one event, or for all events when omitted. */
  clear(event?: keyof TEvents): void {
    if (event === undefined) {
      this.#handlers.clear();
    } else {
      this.#handlers.delete(event);
    }
  }
}

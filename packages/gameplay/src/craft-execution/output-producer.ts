import type { RecipeOutput } from "../recipes/recipe-types.js";
import type { ProducedItem } from "./craft-execution-types.js";

// ---------------------------------------------------------------------------
// Produce result
// ---------------------------------------------------------------------------

export interface ProduceSuccess {
  readonly ok: true;
  readonly produced: readonly ProducedItem[];
}

export interface ProduceFailure {
  readonly ok: false;
  readonly reason: string;
}

export type ProduceResult = ProduceSuccess | ProduceFailure;

// ---------------------------------------------------------------------------
// Interface
// ---------------------------------------------------------------------------

export interface IOutputProducer {
  produce(outputs: readonly RecipeOutput[], quantity: number): ProduceResult;
}

// ---------------------------------------------------------------------------
// In-memory implementation (test / placeholder)
// ---------------------------------------------------------------------------

/**
 * Simple in-memory output producer that tracks produced items in a Map.
 * Used for testing; real inventory integration comes in Phase 14.5.
 */
export class InMemoryOutputProducer implements IOutputProducer {
  readonly #items = new Map<string, number>();

  /** Whether the next produce call should fail (for testing rollback). */
  shouldFail = false;
  failReason = "Production failed";

  getQuantity(itemDefId: string): number {
    return this.#items.get(itemDefId) ?? 0;
  }

  produce(outputs: readonly RecipeOutput[], quantity: number): ProduceResult {
    if (this.shouldFail) {
      return { ok: false, reason: this.failReason };
    }

    const produced: ProducedItem[] = [];
    for (const output of outputs) {
      const amount = output.quantity * quantity;
      this.#items.set(
        output.itemDefId,
        (this.#items.get(output.itemDefId) ?? 0) + amount,
      );
      produced.push({
        itemDefId: output.itemDefId,
        quantity: amount,
        ...(output.tier !== undefined ? { tier: output.tier } : {}),
      });
    }

    return { ok: true, produced };
  }
}

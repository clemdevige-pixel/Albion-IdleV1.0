import type { RecipeIngredient } from "../recipes/recipe-types.js";
import type { ConsumedItem } from "./craft-execution-types.js";

// ---------------------------------------------------------------------------
// Consume result
// ---------------------------------------------------------------------------

export interface ConsumeSuccess {
  readonly ok: true;
  readonly consumed: readonly ConsumedItem[];
}

export interface ConsumeFailure {
  readonly ok: false;
  readonly reason: string;
}

export type ConsumeResult = ConsumeSuccess | ConsumeFailure;

// ---------------------------------------------------------------------------
// Interface
// ---------------------------------------------------------------------------

export interface IIngredientConsumer {
  consume(ingredients: readonly RecipeIngredient[], quantity: number): ConsumeResult;
  rollback(consumed: readonly ConsumedItem[]): void;
}

// ---------------------------------------------------------------------------
// In-memory implementation (test / placeholder)
// ---------------------------------------------------------------------------

/**
 * Simple in-memory ingredient consumer that tracks items in a Map.
 * Used for testing; real inventory integration comes in Phase 14.5.
 */
export class InMemoryIngredientConsumer implements IIngredientConsumer {
  readonly #items = new Map<string, number>();

  /** Seed the in-memory store with items. */
  addItem(itemDefId: string, quantity: number): void {
    this.#items.set(itemDefId, (this.#items.get(itemDefId) ?? 0) + quantity);
  }

  getQuantity(itemDefId: string): number {
    return this.#items.get(itemDefId) ?? 0;
  }

  consume(ingredients: readonly RecipeIngredient[], quantity: number): ConsumeResult {
    // Pre-check all ingredients
    for (const ingredient of ingredients) {
      const needed = ingredient.quantity * quantity;
      const have = this.#items.get(ingredient.itemDefId) ?? 0;
      if (have < needed) {
        return {
          ok: false,
          reason: `Not enough "${ingredient.itemDefId}": need ${needed}, have ${have}`,
        };
      }
    }

    // Consume
    const consumed: ConsumedItem[] = [];
    for (const ingredient of ingredients) {
      const amount = ingredient.quantity * quantity;
      const current = this.#items.get(ingredient.itemDefId)!;
      this.#items.set(ingredient.itemDefId, current - amount);
      consumed.push({
        itemDefId: ingredient.itemDefId,
        quantity: amount,
        ...(ingredient.tier !== undefined ? { tier: ingredient.tier } : {}),
      });
    }

    return { ok: true, consumed };
  }

  rollback(consumed: readonly ConsumedItem[]): void {
    for (const item of consumed) {
      this.#items.set(
        item.itemDefId,
        (this.#items.get(item.itemDefId) ?? 0) + item.quantity,
      );
    }
  }
}

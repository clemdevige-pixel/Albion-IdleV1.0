import type { RecipeIngredient, RecipeOutput } from "../recipes/recipe-types.js";
import type { TransactionState, ConsumedItem, ProducedItem } from "./craft-execution-types.js";
import type { IIngredientConsumer } from "./ingredient-consumer.js";
import type { IOutputProducer } from "./output-producer.js";

// ---------------------------------------------------------------------------
// Transaction result
// ---------------------------------------------------------------------------

export interface TransactionSuccess {
  readonly ok: true;
  readonly consumed: readonly ConsumedItem[];
  readonly produced: readonly ProducedItem[];
}

export interface TransactionFailure {
  readonly ok: false;
  readonly reason: string;
  readonly rolledBack: boolean;
}

export type TransactionResult = TransactionSuccess | TransactionFailure;

// ---------------------------------------------------------------------------
// Transaction
// ---------------------------------------------------------------------------

export class CraftTransaction {
  #state: TransactionState = "pending";
  #consumed: readonly ConsumedItem[] = [];

  get state(): TransactionState {
    return this.#state;
  }

  execute(
    ingredients: readonly RecipeIngredient[],
    outputs: readonly RecipeOutput[],
    quantity: number,
    consumer: IIngredientConsumer,
    producer: IOutputProducer,
  ): TransactionResult {
    // Consume phase
    this.#state = "consuming";
    const consumeResult = consumer.consume(ingredients, quantity);
    if (!consumeResult.ok) {
      this.#state = "rolledBack";
      return { ok: false, reason: consumeResult.reason, rolledBack: false };
    }

    this.#consumed = consumeResult.consumed;

    // Produce phase
    this.#state = "producing";
    const produceResult = producer.produce(outputs, quantity);
    if (!produceResult.ok) {
      // Rollback consumed ingredients
      consumer.rollback(this.#consumed);
      this.#state = "rolledBack";
      return { ok: false, reason: produceResult.reason, rolledBack: true };
    }

    this.#state = "completed";
    return {
      ok: true,
      consumed: this.#consumed,
      produced: produceResult.produced,
    };
  }
}

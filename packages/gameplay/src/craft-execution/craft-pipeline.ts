import type { EventBus } from "@game/core";
import type { RecipeRegistry } from "../recipes/recipe-registry.js";
import type { CraftStationRegistry } from "../craft-stations/craft-station-registry.js";
import type { CraftExecutionRequest, CraftExecutionResult } from "./craft-execution-types.js";
import type { CraftExecutionEventMap } from "./craft-execution-events.js";
import type { IIngredientConsumer } from "./ingredient-consumer.js";
import type { IOutputProducer } from "./output-producer.js";
import { CraftValidator } from "./craft-validator.js";
import { CraftTransaction } from "./craft-transaction.js";

// ---------------------------------------------------------------------------
// Pipeline dependencies
// ---------------------------------------------------------------------------

export interface CraftPipelineDeps {
  readonly recipeRegistry: RecipeRegistry;
  readonly stationRegistry?: CraftStationRegistry | undefined;
  readonly ingredientConsumer: IIngredientConsumer;
  readonly outputProducer: IOutputProducer;
  readonly eventBus: EventBus<CraftExecutionEventMap>;
}

// ---------------------------------------------------------------------------
// Pipeline
// ---------------------------------------------------------------------------

export class CraftPipeline {
  readonly #deps: CraftPipelineDeps;
  readonly #validator = new CraftValidator();

  constructor(deps: CraftPipelineDeps) {
    this.#deps = deps;
  }

  execute(request: CraftExecutionRequest): CraftExecutionResult {
    const { recipeRegistry, stationRegistry, ingredientConsumer, outputProducer, eventBus } =
      this.#deps;

    // 1. Start
    eventBus.publish("execution:started", {
      recipeId: request.recipeId,
      quantity: request.quantity,
    });

    // 2. Validate
    const validation = this.#validator.validateCraft(request, recipeRegistry, stationRegistry);
    if (!validation.ok) {
      eventBus.publish("execution:failed", {
        recipeId: request.recipeId,
        reason: validation.reason,
      });
      return { ok: false, reason: validation.reason, rolledBack: false };
    }

    eventBus.publish("execution:validated", { recipeId: request.recipeId });

    // 3. Get recipe (guaranteed to exist after validation)
    const recipe = recipeRegistry.get(request.recipeId)!;

    // 4. Execute transaction
    const transaction = new CraftTransaction();
    const result = transaction.execute(
      recipe.inputs,
      recipe.outputs,
      request.quantity,
      ingredientConsumer,
      outputProducer,
    );

    if (!result.ok) {
      if (result.rolledBack) {
        eventBus.publish("execution:rolledBack", {
          recipeId: request.recipeId,
          reason: result.reason,
        });
      }
      eventBus.publish("execution:failed", {
        recipeId: request.recipeId,
        reason: result.reason,
      });
      return { ok: false, reason: result.reason, rolledBack: result.rolledBack };
    }

    // 5. Success events
    eventBus.publish("execution:consumed", {
      recipeId: request.recipeId,
      consumed: result.consumed,
    });

    eventBus.publish("execution:produced", {
      recipeId: request.recipeId,
      produced: result.produced,
    });

    eventBus.publish("execution:completed", {
      recipeId: request.recipeId,
      produced: result.produced,
      consumed: result.consumed,
    });

    return {
      ok: true,
      recipeId: request.recipeId,
      produced: result.produced,
      consumed: result.consumed,
    };
  }
}

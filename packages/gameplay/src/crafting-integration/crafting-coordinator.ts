import type { EventBus } from "@game/core";
import type { RecipeRegistry } from "../recipes/recipe-registry.js";
import type { CraftStationRegistry } from "../craft-stations/craft-station-registry.js";
import type { CraftPipeline } from "../craft-execution/craft-pipeline.js";
import type { CraftExecutionRequest, CraftExecutionResult } from "../craft-execution/craft-execution-types.js";
import type { CraftingIntegrationEventMap } from "./crafting-integration-events.js";

// ---------------------------------------------------------------------------
// Coordinator dependencies
// ---------------------------------------------------------------------------

export interface CraftingCoordinatorDeps {
  readonly recipeRegistry: RecipeRegistry;
  readonly stationRegistry?: CraftStationRegistry | undefined;
  readonly pipeline: CraftPipeline;
  readonly eventBus: EventBus<CraftingIntegrationEventMap>;
}

// ---------------------------------------------------------------------------
// Coordinator
// ---------------------------------------------------------------------------

/**
 * Thin orchestration layer that delegates to the CraftPipeline and emits
 * integration-level events.  No new business logic — just wiring.
 */
export class CraftingCoordinator {
  readonly #deps: CraftingCoordinatorDeps;

  constructor(deps: CraftingCoordinatorDeps) {
    this.#deps = deps;
  }

  executeCraft(request: CraftExecutionRequest): CraftExecutionResult {
    const { recipeRegistry, pipeline, eventBus } = this.#deps;

    // Quick guard: recipe must exist before we hit the pipeline
    if (!recipeRegistry.has(request.recipeId)) {
      const reason = `Recipe "${request.recipeId}" not found`;
      eventBus.publish("integration:craftFailed", {
        recipeId: request.recipeId,
        reason,
      });
      return { ok: false, reason, rolledBack: false };
    }

    const result = pipeline.execute(request);

    if (result.ok) {
      eventBus.publish("integration:craftCompleted", {
        recipeId: result.recipeId,
        outputs: result.produced,
        consumed: result.consumed,
      });
    } else {
      eventBus.publish("integration:craftFailed", {
        recipeId: request.recipeId,
        reason: result.reason,
      });
    }

    return result;
  }
}

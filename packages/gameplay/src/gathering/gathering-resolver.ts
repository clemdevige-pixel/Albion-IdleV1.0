import type { ResourceDefinition } from "../resources/resource-types.js";
import type { GatheringResult } from "./gathering-types.js";

/**
 * Resolves the outcome of a completed gathering action.
 */
export function resolveGatherResult(
  resourceDef: ResourceDefinition,
  toolModifier: number,
  masteryModifier: number,
): GatheringResult {
  const quantityGathered = Math.max(
    1,
    Math.floor(resourceDef.baseYield * toolModifier * masteryModifier),
  );

  return {
    resourceFamily: resourceDef.family,
    resourceTier: resourceDef.tier,
    quantityGathered,
    nodeExhausted: false, // caller updates after harvest
  };
}

import type { GameBridgeState, GatheringVM, RefiningVM } from "../../game/GameBridge.js";
import {
  REFINING_CONTENT_TIERS,
  isProductionTier,
  type ProductionFamilyId,
} from "../../data/productionFamilyCatalog.js";
import { RESOURCE_TIER_CONTENT } from "../../data/resourceContentCatalog.js";
import { getProductionRefiningRecipe } from "../../data/refiningRecipes.js";
import { resolveProjectedSegmentRates } from "../../runtime/projectedRateResolver.js";

/**
 * Presentation-facing item yield projection used by the Dashboard resource tracker.
 * Existing gameplay catalogs remain authoritative for every source.
 */
export function resolveDashboardItemYieldPerHour(
  state: GameBridgeState,
): Readonly<Record<string, number>> {
  const projectedCombat = resolveProjectedSegmentRates(state, {
    zoneDefId: state.world.zoneDefId,
    segmentIndex: state.world.segmentIndex - 1,
  });
  const result: Record<string, number> = { ...projectedCombat.itemPerHour };

  for (const [familyId, gathering] of getGatheringEntries(state)) {
    if (gathering.status !== "gathering" || !isProductionTier(gathering.resourceTier)) continue;
    const content = RESOURCE_TIER_CONTENT[familyId][gathering.resourceTier];
    if (content === undefined || gathering.durationSeconds <= 0) continue;
    addRate(result, content.rawItemId, 3600 / gathering.durationSeconds);
  }

  for (const [familyId, refining] of getRefiningEntries(state)) {
    if (refining.status !== "refining" || refining.durationSeconds <= 0) continue;
    const recipe = REFINING_CONTENT_TIERS
      .map((tier) => getProductionRefiningRecipe(familyId, tier))
      .find((candidate) => candidate.name === refining.recipeName);
    if (recipe === undefined) continue;
    addRate(
      result,
      recipe.outputItemId,
      refining.outputQuantity * 3600 / refining.durationSeconds,
    );
  }

  return result;
}

function getGatheringEntries(
  state: GameBridgeState,
): readonly [ProductionFamilyId, GatheringVM][] {
  return [
    ["wood", state.gathering],
    ["ore", state.oreGathering],
    ["hide", state.hideGathering],
    ["fiber", state.fiberGathering],
  ];
}

function getRefiningEntries(
  state: GameBridgeState,
): readonly [ProductionFamilyId, RefiningVM][] {
  return [
    ["wood", state.refining],
    ["ore", state.metalRefining],
    ["hide", state.leatherRefining],
    ["fiber", state.clothRefining],
  ];
}

function addRate(target: Record<string, number>, itemId: string, rate: number): void {
  target[itemId] = (target[itemId] ?? 0) + Math.max(0, rate);
}

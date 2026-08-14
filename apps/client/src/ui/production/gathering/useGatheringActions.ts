import type { ProductionTier, SupportedProductionFamily } from "../../../data/productionFamilyCatalog";
import { useCallback } from "react";
import { useGameServices } from "../../../state/GameContext";
import type { GatheringResourceId } from "./gatheringModels";

export interface GatheringActions {
  readonly setTier: (tier: ProductionTier) => boolean;
  readonly toggleHero: (resource: GatheringResourceId) => boolean;
  readonly strike: (resourceFamily: string, quality: "miss" | "correct" | "perfect") => boolean;
}

export function useGatheringActions(): GatheringActions {
  const {
    setGatheringTier,
    toggleGathering,
    performGatheringStrike,
  } = useGameServices();

  const toggleHero = useCallback((resource: GatheringResourceId): boolean => (
    toggleGathering(
      resource.charAt(0).toUpperCase() + resource.slice(1) as SupportedProductionFamily
    )
  ), [toggleGathering]);

  const strike = useCallback((resourceFamily: string, quality: "miss" | "correct" | "perfect"): boolean => (
    performGatheringStrike(resourceFamily, quality)
  ), [performGatheringStrike]);

  return {
    setTier: setGatheringTier,
    toggleHero,
    strike,
  };
}

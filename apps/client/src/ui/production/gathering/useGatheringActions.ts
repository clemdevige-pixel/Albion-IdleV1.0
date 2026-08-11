import { useCallback } from "react";
import type { WorkerProfessionVM } from "../../../game/GameBridge";
import { useGameServices } from "../../../state/GameContext";
import type { GatheringResourceId } from "./gatheringModels";

export interface GatheringActions {
  readonly setTier: (tier: 3 | 4) => boolean;
  readonly toggleHero: (resource: GatheringResourceId) => boolean;
  readonly recruitWorker: (profession: WorkerProfessionVM) => boolean;
  readonly toggleWorker: (profession: WorkerProfessionVM) => boolean;
  readonly strike: (resourceFamily: string, quality: "miss" | "correct" | "perfect") => boolean;
}

export function useGatheringActions(): GatheringActions {
  const {
    setProductionTier,
    toggleGathering,
    toggleHideGathering,
    toggleFiberGathering,
    toggleOreGathering,
    recruitWorker,
    toggleWorker,
    performGatheringStrike,
  } = useGameServices();

  const toggleHero = useCallback((resource: GatheringResourceId): boolean => {
    switch (resource) {
      case "wood": return toggleGathering();
      case "hide": return toggleHideGathering();
      case "fiber": return toggleFiberGathering();
      case "ore": return toggleOreGathering();
      default: return assertNever(resource);
    }
  }, [toggleFiberGathering, toggleGathering, toggleHideGathering, toggleOreGathering]);

  const strike = useCallback((resourceFamily: string, quality: "miss" | "correct" | "perfect"): boolean => (
    performGatheringStrike(resourceFamily, quality)
  ), [performGatheringStrike]);

  return {
    setTier: setProductionTier,
    toggleHero,
    recruitWorker,
    toggleWorker,
    strike,
  };
}

function assertNever(value: never): never {
  throw new Error(`Unsupported Gathering resource: ${String(value)}`);
}

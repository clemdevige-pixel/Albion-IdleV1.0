import { useCallback } from "react";
import { useGameServices } from "../../../state/GameContext";
import type { RefiningFamilyId } from "./refiningModels";

export interface RefiningActions {
  readonly setTier: (tier: 3 | 4) => boolean;
  readonly toggle: (family: RefiningFamilyId) => boolean;
  readonly refineAll: () => boolean;
}

export function useRefiningActions(): RefiningActions {
  const {
    setProductionTier,
    toggleRefining,
    toggleMetalRefining,
    toggleLeatherRefining,
    toggleClothRefining,
    refineAllAvailable,
  } = useGameServices();

  const toggle = useCallback((family: RefiningFamilyId): boolean => {
    switch (family) {
      case "wood": return toggleRefining();
      case "ore": return toggleMetalRefining();
      case "hide": return toggleLeatherRefining();
      case "fiber": return toggleClothRefining();
      default: return assertNever(family);
    }
  }, [toggleClothRefining, toggleLeatherRefining, toggleMetalRefining, toggleRefining]);

  return { setTier: setProductionTier, toggle, refineAll: refineAllAvailable };
}

function assertNever(value: never): never {
  throw new Error(`Unsupported Refining family: ${String(value)}`);
}

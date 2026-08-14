import type { ProductionTier, SupportedProductionFamily } from "../../../data/productionFamilyCatalog";
import { useCallback } from "react";
import { useGameServices } from "../../../state/GameContext";
import type { RefiningFamilyId } from "./refiningModels";

export interface RefiningActions {
  readonly setTier: (family: RefiningFamilyId, tier: ProductionTier) => boolean;
  readonly toggle: (family: RefiningFamilyId) => boolean;
  readonly refineAll: () => boolean;
}

function toGameplayFamily(family: RefiningFamilyId): SupportedProductionFamily {
  return family.charAt(0).toUpperCase() + family.slice(1) as SupportedProductionFamily;
}

export function useRefiningActions(): RefiningActions {
  const {
    setRefiningTier,
    toggleRefining,
    refineAllAvailable,
  } = useGameServices();

  const setTier = useCallback((family: RefiningFamilyId, tier: ProductionTier): boolean => (
    setRefiningTier(toGameplayFamily(family), tier)
  ), [setRefiningTier]);

  const toggle = useCallback((family: RefiningFamilyId): boolean => (
    toggleRefining(toGameplayFamily(family))
  ), [toggleRefining]);

  return { setTier, toggle, refineAll: refineAllAvailable };
}

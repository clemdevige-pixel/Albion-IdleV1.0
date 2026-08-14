import type { ProductionTier, SupportedProductionFamily } from "../../../data/productionFamilyCatalog";
import { useCallback } from "react";
import { useGameServices } from "../../../state/GameContext";
import type { RefiningFamilyId } from "./refiningModels";

export interface RefiningActions {
  readonly setTier: (tier: ProductionTier) => boolean;
  readonly toggle: (family: RefiningFamilyId) => boolean;
  readonly refineAll: () => boolean;
}

export function useRefiningActions(): RefiningActions {
  const {
    setRefiningTier,
    toggleRefining,
    refineAllAvailable,
  } = useGameServices();

  const toggle = useCallback((family: RefiningFamilyId): boolean => (
    toggleRefining(
      family.charAt(0).toUpperCase() + family.slice(1) as SupportedProductionFamily
    )
  ), [toggleRefining]);

  return { setTier: setRefiningTier, toggle, refineAll: refineAllAvailable };
}

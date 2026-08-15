import type { ProductionTier } from "../../../data/productionFamilyCatalog";
import { useGameServices } from "../../../state/GameContext";

export interface CraftingActions {
  readonly setTier: (tier: ProductionTier) => boolean;
  readonly craft: (outputItemId: string) => boolean;
}

export function useCraftingActions(): CraftingActions {
  const { setCraftingTier, craftEquipment } = useGameServices();
  return { setTier: setCraftingTier, craft: craftEquipment };
}

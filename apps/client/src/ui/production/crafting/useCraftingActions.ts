import { useGameServices } from "../../../state/GameContext";

export interface CraftingActions {
  readonly setTier: (tier: 3 | 4) => boolean;
  readonly craft: (outputItemId: string) => boolean;
}

export function useCraftingActions(): CraftingActions {
  const { setProductionTier, craftEquipment } = useGameServices();
  return { setTier: setProductionTier, craft: craftEquipment };
}

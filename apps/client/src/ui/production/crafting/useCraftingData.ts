import { useMemo } from "react";
import { useGameUiSelector } from "../../state/useGameUiSelector";
import { buildCraftingModel, selectCraftingSource, type CraftingModel } from "./craftingModels";

export function useCraftingData(): CraftingModel {
  const source = useGameUiSelector(selectCraftingSource);
  return useMemo(() => buildCraftingModel(source), [source]);
}

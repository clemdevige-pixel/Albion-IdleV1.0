import { useGameUiSelector } from "../state/useGameUiSelector";
import { selectInventory, type InventoryModel } from "./inventoryModels";

export function useInventoryData(): InventoryModel {
  return useGameUiSelector(selectInventory);
}

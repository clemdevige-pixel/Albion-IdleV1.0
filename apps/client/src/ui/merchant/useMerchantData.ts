import { useGameUiSelector } from "../state/useGameUiSelector";
import { selectMerchantSnapshot, type MerchantSnapshot } from "./merchantModels";

export function useMerchantData(): MerchantSnapshot {
  return useGameUiSelector(selectMerchantSnapshot);
}

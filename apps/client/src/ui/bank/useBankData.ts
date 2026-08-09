import { useGameUiSelector } from "../state/useGameUiSelector";
import { selectBank, type BankModel } from "./bankModels";

export function useBankData(): BankModel {
  return useGameUiSelector(selectBank);
}

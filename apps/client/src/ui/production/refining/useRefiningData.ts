import { useMemo } from "react";
import { useGameUiSelector } from "../../state/useGameUiSelector";
import { buildRefiningModel, selectRefiningSource, type RefiningModel } from "./refiningModels";

export function useRefiningData(): RefiningModel {
  const source = useGameUiSelector(selectRefiningSource);
  return useMemo(() => buildRefiningModel(source), [source]);
}

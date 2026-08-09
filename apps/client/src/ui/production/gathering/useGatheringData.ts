import { useMemo } from "react";
import { useGameUiSelector } from "../../state/useGameUiSelector";
import { buildGatheringModel, selectGatheringSource, type GatheringModel } from "./gatheringModels";

export function useGatheringData(): GatheringModel {
  const source = useGameUiSelector(selectGatheringSource);
  return useMemo(() => buildGatheringModel(source), [source]);
}

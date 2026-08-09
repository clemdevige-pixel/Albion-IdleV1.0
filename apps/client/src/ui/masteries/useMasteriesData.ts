import { useMemo } from "react";
import { shallowEqual, useGameUiSelector } from "../state/useGameUiSelector";
import { buildMasteriesModel, selectMasteriesSource } from "./masteryModels";

export function useMasteriesData(): ReturnType<typeof buildMasteriesModel> {
  const source = useGameUiSelector(selectMasteriesSource, shallowEqual);
  return useMemo(() => buildMasteriesModel(source), [source]);
}

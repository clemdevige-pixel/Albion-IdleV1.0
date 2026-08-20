import {
  getIslandBuildingDefinition,
  type IslandBuildingId,
} from "@game/data";

interface WorkerGatheringBuildingCandidate {
  readonly definitionId: IslandBuildingId;
}

export function findWorkerGatheringBuilding<
  TBuilding extends WorkerGatheringBuildingCandidate,
>(
  buildings: readonly TBuilding[],
  profession: string,
): TBuilding | undefined {
  return buildings.find((building) => {
    const definition = getIslandBuildingDefinition(building.definitionId);
    return definition.gatheringService?.workerProfession === profession;
  });
}

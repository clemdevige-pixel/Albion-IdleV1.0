import type {
  GameBridgeState,
  GatheringVM,
  MasteryVM,
  WorkerProfessionVM,
  WorkerVM,
} from "../../../game/GameBridge";
import {
  PRODUCTION_FAMILY_IDS,
  getProductionFamilyDefinition,
  type ProductionFamilyId,
} from "../../../data/productionFamilyCatalog";
import { masteryProgressPercent } from "../../shared/masteryProgress";

export type GatheringResourceId = ProductionFamilyId;

export interface GatheringHeroMasteryModel {
  readonly level: number;
  readonly currentXp: number;
  readonly xpToNextLevel: number;
  readonly progressPercent: number;
}

export interface GatheringResourceModel {
  readonly id: GatheringResourceId;
  readonly label: string;
  readonly icon: string;
  readonly tool: string;
  readonly profession: WorkerProfessionVM;
  readonly activity: GatheringVM;
  readonly heroMastery: GatheringHeroMasteryModel;
  readonly worker: WorkerVM | undefined;
}

export interface GatheringModel {
  readonly tier: 3 | 4;
  readonly recruitmentCost: number;
  readonly workerCapacity: number;
  readonly recruitedWorkerCount: number;
  readonly resources: readonly GatheringResourceModel[];
}

interface GatheringSource {
  readonly tier: 3 | 4;
  readonly recruitmentCost: number;
  readonly workerCapacity: number;
  readonly workers: readonly WorkerVM[];
  readonly masteries: readonly MasteryVM[];
  readonly gathering: GatheringVM;
  readonly hideGathering: GatheringVM;
  readonly fiberGathering: GatheringVM;
  readonly oreGathering: GatheringVM;
}

export function selectGatheringSource(state: GameBridgeState): GatheringSource {
  return {
    tier: state.crafting.productionTier,
    recruitmentCost: state.workers.recruitmentCost,
    workerCapacity: state.workers.capacity,
    workers: state.workers.workers,
    masteries: state.progression.masteries,
    gathering: state.gathering,
    hideGathering: state.hideGathering,
    fiberGathering: state.fiberGathering,
    oreGathering: state.oreGathering,
  };
}

export function buildGatheringModel(source: GatheringSource): GatheringModel {
  const activities = {
    wood: source.gathering,
    ore: source.oreGathering,
    hide: source.hideGathering,
    fiber: source.fiberGathering,
  } satisfies Record<GatheringResourceId, GatheringVM>;

  const createResource = (id: GatheringResourceId): GatheringResourceModel => {
    const definition = getProductionFamilyDefinition(id);
    const activity = activities[id];
    const mastery = source.masteries.find((candidate) => candidate.id === definition.masteryId);
    const heroMastery = mastery === undefined
      ? { level: activity.masteryLevel, currentXp: 0, xpToNextLevel: 0, progressPercent: 0 }
      : {
          level: mastery.level,
          currentXp: mastery.currentXp,
          xpToNextLevel: mastery.xpToNextLevel,
          progressPercent: masteryProgressPercent(mastery),
        };

    return {
      id,
      activity,
      heroMastery,
      label: definition.label,
      icon: definition.gatheringIcon,
      profession: definition.profession,
      tool: definition.tiers[source.tier].toolName,
      worker: source.workers.find((worker) => worker.profession === definition.profession),
    };
  };

  return {
    tier: source.tier,
    recruitmentCost: source.recruitmentCost,
    workerCapacity: source.workerCapacity,
    recruitedWorkerCount: source.workers.length,
    resources: PRODUCTION_FAMILY_IDS.map(createResource),
  };
}

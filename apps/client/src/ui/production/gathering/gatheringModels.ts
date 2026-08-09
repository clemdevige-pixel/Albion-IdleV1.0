import type {
  GameBridgeState,
  GatheringVM,
  MasteryVM,
  WorkerProfessionVM,
  WorkerVM,
} from "../../../game/GameBridge";
import { masteryProgressPercent } from "../../shared/masteryProgress";

export type GatheringResourceId = "wood" | "hide" | "fiber" | "ore";

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
  const createResource = (
    id: GatheringResourceId,
    activity: GatheringVM,
    label: string,
    icon: string,
    profession: WorkerProfessionVM,
    masteryId: string,
    tier3Tool: string,
    tier4Tool: string,
  ): GatheringResourceModel => {
    const mastery = source.masteries.find((candidate) => candidate.id === masteryId);
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
      label,
      icon,
      profession,
      tool: source.tier === 4 ? tier4Tool : tier3Tool,
      worker: source.workers.find((worker) => worker.profession === profession),
    };
  };

  return {
    tier: source.tier,
    recruitmentCost: source.recruitmentCost,
    workerCapacity: source.workerCapacity,
    recruitedWorkerCount: source.workers.length,
    resources: [
      createResource("wood", source.gathering, "Bois", "resource-birch-node.png", "woodcutter", "mastery_gathering_wood", "Hache de compagnon", "Hache T4"),
      createResource("ore", source.oreGathering, "Minerai", "resource-copper-pickaxe.png", "miner", "mastery_gathering_ore", "Pioche de compagnon", "Pioche T4"),
      createResource("hide", source.hideGathering, "Peau", "resource-hide.png", "skinner", "mastery_gathering_hide", "Couteau de dépeçage", "Couteau de dépeçage T4"),
      createResource("fiber", source.fiberGathering, "Fibres", "resource-fiber.png", "fiber_harvester", "mastery_gathering_fiber", "Faucille de compagnon", "Faucille T4"),
    ],
  };
}

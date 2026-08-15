import type { GameBridgeState, GatheringVM, MasteryVM } from "../../../game/GameBridge";
import {
  PRODUCTION_FAMILY_IDS,
  getProductionFamilyDefinition,
  isProductionTier,
  requireProductionTierPresentation,
  type ProductionFamilyId,
  type ProductionTier,
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
  readonly activity: GatheringVM;
  readonly heroMastery: GatheringHeroMasteryModel;
}

export interface GatheringModel {
  readonly tier: ProductionTier;
  readonly resources: readonly GatheringResourceModel[];
}

interface GatheringSource {
  readonly tier: ProductionTier;
  readonly masteries: readonly MasteryVM[];
  readonly gathering: GatheringVM;
  readonly hideGathering: GatheringVM;
  readonly fiberGathering: GatheringVM;
  readonly oreGathering: GatheringVM;
}

export function selectGatheringSource(state: GameBridgeState): GatheringSource {
  const tier = isProductionTier(state.gathering.resourceTier)
    ? state.gathering.resourceTier
    : 3;
  return {
    tier,
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
      tool: requireProductionTierPresentation(definition.gameplayFamily, source.tier).toolName,
    };
  };

  return {
    tier: source.tier,
    resources: PRODUCTION_FAMILY_IDS.map(createResource),
  };
}

import type { MasteryId } from "@game/gameplay";
import { DUNGEON_DEFINITIONS } from "../../data/dungeonContentCatalog.js";
import {
  FACTION_ACHIEVEMENT_DEFINITIONS,
  type FactionAchievementCondition,
  type FactionAchievementDefinition,
} from "../../data/factionAchievementContentCatalog.js";
import {
  getFactionExpeditionTypeId,
  SILVER_EXPEDITION_TYPE_ID,
} from "../../data/expeditionContentCatalog.js";
import { resolveFactionMasteryId } from "../../data/factionMasteryContentCatalog.js";

export interface FactionAchievementProgress {
  readonly definition: FactionAchievementDefinition;
  readonly current: number;
  readonly target: number;
  readonly completed: boolean;
}

interface FactionKnowledgeProgressSource {
  isMonsterDiscovered(monsterId: string): boolean;
  getFactionKillCount(factionId: string): number;
  getFactionEliteKillCount(factionId: string): number;
}

interface RelicProgressSource {
  isReconstructed(relicId: string): boolean;
}

interface ExpeditionProgressSource {
  getCompletedCount(typeId: string): number;
  getTotalCompletedCount(): number;
}

interface ExpeditionRewardProgressSource {
  getLifetimeSilverCredited(): number;
}

interface DungeonProgressSource {
  getCompletedDefinitionCount(definitionId: string): number;
}

interface MasteryProgressSource {
  getMasteryState(masteryId: MasteryId): { readonly level: number } | undefined;
}

export interface FactionAchievementFoundationDependencies {
  readonly factionKnowledgeService: FactionKnowledgeProgressSource;
  readonly relicService: RelicProgressSource;
  readonly expeditionService: ExpeditionProgressSource;
  readonly expeditionRewardLedger: ExpeditionRewardProgressSource;
  readonly dungeonRuntime: DungeonProgressSource;
  readonly masteryService: MasteryProgressSource;
}

function normalizeFactionId(value: string): string {
  return value.trim().toLowerCase();
}

export function createFactionAchievementFoundation(
  dependencies: FactionAchievementFoundationDependencies,
) {
  const getFactionDungeonCompletedCount = (factionId: string): number => (
    DUNGEON_DEFINITIONS
      .filter((definition) => normalizeFactionId(definition.faction) === factionId)
      .reduce(
        (total, definition) => total + dependencies.dungeonRuntime.getCompletedDefinitionCount(definition.id),
        0,
      )
  );

  const resolveCondition = (
    condition: FactionAchievementCondition,
  ): { readonly current: number; readonly target: number } => {
    switch (condition.type) {
      case "faction_unit_discovery":
        return {
          current: condition.monsterIds.filter((monsterId) => (
            dependencies.factionKnowledgeService.isMonsterDiscovered(monsterId)
          )).length,
          target: condition.monsterIds.length,
        };
      case "faction_kill_count":
        return {
          current: dependencies.factionKnowledgeService.getFactionKillCount(condition.factionId),
          target: condition.minimum,
        };
      case "faction_elite_kill_count":
        return {
          current: dependencies.factionKnowledgeService.getFactionEliteKillCount(condition.factionId),
          target: condition.minimum,
        };
      case "faction_relic_reconstructed":
        return {
          current: dependencies.relicService.isReconstructed(condition.relicId) ? 1 : 0,
          target: 1,
        };
      case "faction_expedition_completed_count": {
        const typeId = getFactionExpeditionTypeId(condition.factionId);
        return {
          current: typeId === undefined ? 0 : dependencies.expeditionService.getCompletedCount(typeId),
          target: condition.minimum,
        };
      }
      case "faction_dungeon_completed_count":
        return {
          current: getFactionDungeonCompletedCount(condition.factionId),
          target: condition.minimum,
        };
      case "faction_mastery_level": {
        const masteryId = resolveFactionMasteryId(condition.factionId);
        return {
          current: masteryId === undefined
            ? 0
            : dependencies.masteryService.getMasteryState(masteryId)?.level ?? 0,
          target: condition.minimum,
        };
      }
      case "expedition_completed_count":
        return {
          current: dependencies.expeditionService.getTotalCompletedCount(),
          target: condition.minimum,
        };
      case "silver_expedition_completed_count":
        return {
          current: dependencies.expeditionService.getCompletedCount(SILVER_EXPEDITION_TYPE_ID),
          target: condition.minimum,
        };
      case "silver_expedition_lifetime_silver":
        return {
          current: dependencies.expeditionRewardLedger.getLifetimeSilverCredited(),
          target: condition.minimum,
        };
    }
  };

  const getProgress = (
    definition: FactionAchievementDefinition,
  ): FactionAchievementProgress => {
    const progress = resolveCondition(definition.condition);
    return {
      definition,
      ...progress,
      completed: progress.current >= progress.target,
    };
  };

  return {
    getDefinitions: (): readonly FactionAchievementDefinition[] => FACTION_ACHIEVEMENT_DEFINITIONS,
    getProgress,
    getAllProgress: (): readonly FactionAchievementProgress[] => (
      FACTION_ACHIEVEMENT_DEFINITIONS.map(getProgress)
    ),
  };
}

export type FactionAchievementFoundation = ReturnType<typeof createFactionAchievementFoundation>;

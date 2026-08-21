import type { RelicDefinition } from "@game/gameplay";
import { getMonsterDefinition } from "../../data/monsterContentCatalog.js";
import { RELIC_DEFINITIONS } from "../../data/relicContentCatalog.js";

interface FactionKnowledgeSource {
  isMonsterDiscovered(monsterId: string): boolean;
  getMonsterKillCount(monsterId: string): number;
  getFactionKillCount(factionId: string): number;
  getFactionEliteKillCount(factionId: string): number;
}

interface RelicProgressSource {
  getProgress(relicId: string): {
    readonly fragmentCount: number;
    readonly completedObjectiveIds: readonly string[];
    readonly reconstructed: boolean;
  } | undefined;
}

export interface BestiaryRelicProgressModel {
  readonly relicId: string;
  readonly fragmentCount: number;
  readonly objectiveCount: number;
  readonly reconstructed: boolean;
}

export interface BestiaryKnowledgeModel {
  readonly monsterId: string;
  readonly factionId: string | undefined;
  readonly discovered: boolean;
  readonly killCount: number;
  readonly factionKillCount: number;
  readonly factionEliteKillCount: number;
  readonly relic: BestiaryRelicProgressModel | undefined;
}

export interface FactionBestiaryFoundationDependencies {
  readonly factionKnowledgeService: FactionKnowledgeSource;
  readonly relicService: RelicProgressSource;
}

function normalizeFactionId(value: string): string | undefined {
  const normalized = value.trim().toLowerCase();
  return normalized === "" || normalized === "none" ? undefined : normalized;
}

function getRelicDefinitionForFaction(factionId: string | undefined): RelicDefinition | undefined {
  if (factionId === undefined) return undefined;
  return RELIC_DEFINITIONS.find((definition) => definition.factionId === factionId);
}

export function createFactionBestiaryFoundation(
  dependencies: FactionBestiaryFoundationDependencies,
) {
  const getKnowledge = (monsterId: string): BestiaryKnowledgeModel => {
    const monster = getMonsterDefinition(monsterId);
    const factionId = normalizeFactionId(monster.faction);
    const relicDefinition = getRelicDefinitionForFaction(factionId);
    const relicProgress = relicDefinition === undefined
      ? undefined
      : dependencies.relicService.getProgress(relicDefinition.id);

    return {
      monsterId,
      factionId,
      discovered: dependencies.factionKnowledgeService.isMonsterDiscovered(monsterId),
      killCount: dependencies.factionKnowledgeService.getMonsterKillCount(monsterId),
      factionKillCount: factionId === undefined
        ? 0
        : dependencies.factionKnowledgeService.getFactionKillCount(factionId),
      factionEliteKillCount: factionId === undefined
        ? 0
        : dependencies.factionKnowledgeService.getFactionEliteKillCount(factionId),
      relic: relicDefinition === undefined || relicProgress === undefined
        ? undefined
        : {
          relicId: relicDefinition.id,
          fragmentCount: relicProgress.fragmentCount,
          objectiveCount: relicDefinition.objectives.length,
          reconstructed: relicProgress.reconstructed,
        },
    };
  };

  return { getKnowledge };
}

export type FactionBestiaryFoundation = ReturnType<typeof createFactionBestiaryFoundation>;

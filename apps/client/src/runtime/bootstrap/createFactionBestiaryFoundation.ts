import { getMonsterDefinition } from "../../data/monsterContentCatalog.js";

interface FactionKnowledgeSource {
  isMonsterDiscovered(monsterId: string): boolean;
  getMonsterKillCount(monsterId: string): number;
  getFactionKillCount(factionId: string): number;
  getFactionEliteKillCount(factionId: string): number;
}

export interface BestiaryKnowledgeModel {
  readonly monsterId: string;
  readonly factionId: string | undefined;
  readonly discovered: boolean;
  readonly killCount: number;
  readonly factionKillCount: number;
  readonly factionEliteKillCount: number;
}

export interface FactionBestiaryFoundationDependencies {
  readonly factionKnowledgeService: FactionKnowledgeSource;
}

function normalizeFactionId(value: string): string | undefined {
  const normalized = value.trim().toLowerCase();
  return normalized === "" || normalized === "none" ? undefined : normalized;
}

export function createFactionBestiaryFoundation(
  dependencies: FactionBestiaryFoundationDependencies,
) {
  const getKnowledge = (monsterId: string): BestiaryKnowledgeModel => {
    const monster = getMonsterDefinition(monsterId);
    const factionId = normalizeFactionId(monster.faction);

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
    };
  };

  return { getKnowledge };
}

export type FactionBestiaryFoundation = ReturnType<typeof createFactionBestiaryFoundation>;

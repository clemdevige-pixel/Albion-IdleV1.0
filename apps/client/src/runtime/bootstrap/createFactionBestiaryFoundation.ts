interface FactionKnowledgeSource {
  isMonsterDiscovered(monsterId: string): boolean;
  getMonsterKillCount(monsterId: string, contextId?: string): number;
}

export interface BestiaryKnowledgeModel {
  readonly monsterId: string;
  readonly discovered: boolean;
  readonly killCount: number;
}

export interface FactionBestiaryFoundationDependencies {
  readonly factionKnowledgeService: FactionKnowledgeSource;
}

export function createFactionBestiaryFoundation(
  dependencies: FactionBestiaryFoundationDependencies,
) {
  const getKnowledge = (
    monsterId: string,
    contextIds?: readonly string[],
  ): BestiaryKnowledgeModel => ({
    monsterId,
    discovered: dependencies.factionKnowledgeService.isMonsterDiscovered(monsterId),
    killCount: contextIds === undefined
      ? dependencies.factionKnowledgeService.getMonsterKillCount(monsterId)
      : contextIds.reduce(
          (total, contextId) => (
            total + dependencies.factionKnowledgeService.getMonsterKillCount(monsterId, contextId)
          ),
          0,
        ),
  });

  return { getKnowledge };
}

export type FactionBestiaryFoundation = ReturnType<typeof createFactionBestiaryFoundation>;

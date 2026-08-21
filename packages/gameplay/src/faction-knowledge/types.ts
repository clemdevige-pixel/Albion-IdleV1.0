export type FactionId = string;

export interface FactionKnowledgeMonsterDefinition {
  readonly monsterId: string;
  readonly factionId: FactionId;
  readonly isElite: boolean;
}

export interface FactionKnowledgeMonsterResolver {
  resolveMonster(monsterId: string): FactionKnowledgeMonsterDefinition | undefined;
}

export type RecordFactionKnowledgeKillResult =
  | { readonly ok: true; readonly monsterId: string; readonly totalKills: number }
  | { readonly ok: false; readonly reason: "unknown_monster" };

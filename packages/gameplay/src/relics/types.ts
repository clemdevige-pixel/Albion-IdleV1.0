import type { FactionId } from "../faction-knowledge/types.js";

export const RELIC_OBJECTIVE_COUNT = 5;

export type RelicId = string;
export type RelicObjectiveId = string;

export type RelicObjectiveRequirement =
  | { readonly type: "all_monsters_killed"; readonly monsterIds: readonly string[]; readonly minimumEach: number }
  | { readonly type: "monster_kill_count"; readonly monsterId: string; readonly minimum: number }
  | { readonly type: "faction_kill_count"; readonly factionId: FactionId; readonly minimum: number }
  | { readonly type: "faction_elite_kill_count"; readonly factionId: FactionId; readonly minimum: number }
  | { readonly type: "world_segment_progress"; readonly zoneDefId: string; readonly minimumCompletedSegments: number };

export interface RelicObjectiveDefinition {
  readonly id: RelicObjectiveId;
  readonly requirement: RelicObjectiveRequirement;
}

export interface RelicDefinition {
  readonly id: RelicId;
  readonly factionId: FactionId;
  readonly objectives: readonly RelicObjectiveDefinition[];
}

export interface RelicProgressPort {
  getMonsterKillCount(monsterId: string): number;
  getFactionKillCount(factionId: FactionId): number;
  getFactionEliteKillCount(factionId: FactionId): number;
  getCompletedSegmentCount(zoneDefId: string): number;
}

export interface RelicReconstructionPort {
  canReconstructRelic(definition: RelicDefinition): boolean;
}

export interface RelicProgressView {
  readonly relicId: RelicId;
  readonly completedObjectiveIds: readonly RelicObjectiveId[];
  readonly fragmentCount: number;
  readonly reconstructed: boolean;
}

export type RegisterRelicResult =
  | { readonly ok: true }
  | { readonly ok: false; readonly reason: "invalid_definition" | "duplicate_relic" };

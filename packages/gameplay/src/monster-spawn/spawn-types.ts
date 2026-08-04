import type { Brand } from "@game/core";
import type { MonsterDefinitionId, MonsterInstanceId } from "../monsters/types.js";

// ---------------------------------------------------------------------------
// Branded identifiers
// ---------------------------------------------------------------------------

export type SpawnPointId = Brand<string, "SpawnPointId">;

export function asSpawnPointId(s: string): SpawnPointId {
  return s as SpawnPointId;
}

export type SpawnGroupId = Brand<string, "SpawnGroupId">;

export function asSpawnGroupId(s: string): SpawnGroupId {
  return s as SpawnGroupId;
}

// ---------------------------------------------------------------------------
// Spawn Point — defines where a monster can appear
// ---------------------------------------------------------------------------

export interface SpawnPointConfig {
  readonly id: SpawnPointId;
  readonly definitionId: MonsterDefinitionId;
  readonly groupId: SpawnGroupId;
  /** Respawn delay in ticks after the spawned monster dies. */
  readonly respawnDelayTicks: number;
  /** Whether this point is enabled at all. */
  readonly enabled: boolean;
}

// ---------------------------------------------------------------------------
// Spawn Group — shared config for a group of spawn points
// ---------------------------------------------------------------------------

export interface SpawnGroupConfig {
  readonly id: SpawnGroupId;
  readonly name: string;
  /** Maximum number of alive monsters across the entire group. */
  readonly populationCap: number;
}

// ---------------------------------------------------------------------------
// Internal state tracked per spawn point
// ---------------------------------------------------------------------------

export interface SpawnPointState {
  /** Currently alive monster instance at this point, if any. */
  readonly activeInstanceId: MonsterInstanceId | undefined;
  /** Tick at which the respawn timer started, or undefined if not waiting. */
  readonly respawnStartTick: number | undefined;
}

// ---------------------------------------------------------------------------
// Spawn conditions check result
// ---------------------------------------------------------------------------

export type SpawnDeniedReason =
  | "point_disabled"
  | "point_occupied"
  | "group_not_found"
  | "population_cap_reached"
  | "respawn_cooldown"
  | "spawn_failed";

export type SpawnConditionResult =
  | { readonly ok: true }
  | { readonly ok: false; readonly reason: SpawnDeniedReason };

import type { Brand } from "@game/core";
import type { MonsterDefinitionId } from "../monsters/types.js";
import type { SpawnGroupId } from "../monster-spawn/spawn-types.js";

// ---------------------------------------------------------------------------
// Branded identifiers
// ---------------------------------------------------------------------------

export type ZoneId = Brand<string, "ZoneId">;

export function asZoneId(s: string): ZoneId {
  return s as ZoneId;
}

export type ZoneDefinitionId = Brand<string, "ZoneDefinitionId">;

export function asZoneDefinitionId(s: string): ZoneDefinitionId {
  return s as ZoneDefinitionId;
}

// ---------------------------------------------------------------------------
// Zone Definition — data-driven description of a zone
// ---------------------------------------------------------------------------

/** Describes a monster spawn entry within a zone definition. */
export interface ZoneMonsterSpawn {
  readonly definitionId: MonsterDefinitionId;
  readonly spawnGroupId: SpawnGroupId;
  /** Number of spawn points for this monster type. */
  readonly count: number;
  /** Respawn delay in ticks after death. */
  readonly respawnDelayTicks: number;
}

/** Static, immutable description of a zone. */
export interface ZoneDefinition {
  readonly id: ZoneDefinitionId;
  readonly name: string;
  /** Tier (1–8) controlling difficulty / loot. */
  readonly tier: number;
  /** Monster spawns available in this zone. */
  readonly monsterSpawns: readonly ZoneMonsterSpawn[];
  /** Optional tags for filtering / categorisation. */
  readonly tags: readonly string[];
}

// ---------------------------------------------------------------------------
// Zone Instance — runtime state of a loaded zone
// ---------------------------------------------------------------------------

export type ZoneStatus = "loading" | "active" | "inactive" | "unloading";

export interface ZoneInstance {
  readonly id: ZoneId;
  readonly definitionId: ZoneDefinitionId;
  readonly status: ZoneStatus;
}

// ---------------------------------------------------------------------------
// Zone transition result
// ---------------------------------------------------------------------------

export type ZoneTransitionDeniedReason =
  | "zone_not_found"
  | "zone_already_active"
  | "zone_not_active"
  | "definition_not_found"
  | "already_in_zone";

export type ZoneTransitionResult =
  | { readonly ok: true; readonly zoneId: ZoneId }
  | { readonly ok: false; readonly reason: ZoneTransitionDeniedReason };

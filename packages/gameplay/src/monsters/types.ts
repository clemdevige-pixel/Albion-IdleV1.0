import type { Brand, EntityId } from "@game/core";
import type { StatId } from "../stats/types.js";

// ---------------------------------------------------------------------------
// Branded identifiers
// ---------------------------------------------------------------------------

export type MonsterId = Brand<string, "MonsterId">;

export function asMonsterId(s: string): MonsterId {
  return s as MonsterId;
}

export type MonsterDefinitionId = Brand<string, "MonsterDefinitionId">;

export function asMonsterDefinitionId(s: string): MonsterDefinitionId {
  return s as MonsterDefinitionId;
}

export type MonsterInstanceId = Brand<string, "MonsterInstanceId">;

export function asMonsterInstanceId(s: string): MonsterInstanceId {
  return s as MonsterInstanceId;
}

// ---------------------------------------------------------------------------
// Monster state
// ---------------------------------------------------------------------------

export type MonsterState = "alive" | "dead" | "despawned";

// ---------------------------------------------------------------------------
// Monster definition (data template)
// ---------------------------------------------------------------------------

export interface MonsterStatEntry {
  readonly statId: StatId;
  readonly baseValue: number;
}

export interface MonsterDefinition {
  readonly id: MonsterDefinitionId;
  readonly name: string;
  readonly faction: string;
  readonly role: string;
  readonly tier: number;
  readonly baseStats: readonly MonsterStatEntry[];
}

// ---------------------------------------------------------------------------
// Monster instance (live runtime data, read-only snapshot)
// ---------------------------------------------------------------------------

export interface MonsterInstanceData {
  readonly instanceId: MonsterInstanceId;
  readonly definitionId: MonsterDefinitionId;
  readonly entityId: EntityId;
  readonly state: MonsterState;
  readonly name: string;
  readonly tier: number;
}

// ---------------------------------------------------------------------------
// Result pattern
// ---------------------------------------------------------------------------

export type MonsterResult<T> =
  | { readonly ok: true; readonly value: T }
  | { readonly ok: false; readonly reason: MonsterFailureReason };

export type MonsterFailureReason =
  | "definition_not_found"
  | "instance_not_found"
  | "invalid_transition"
  | "already_dead"
  | "already_despawned";

import type { Brand, EntityId } from "@game/core";

// ---------------------------------------------------------------------------
// Branded identifiers
// ---------------------------------------------------------------------------

export type CombatSessionId = Brand<string, "CombatSessionId">;

export function asCombatSessionId(s: string): CombatSessionId {
  return s as CombatSessionId;
}

export type EncounterId = Brand<string, "EncounterId">;

export function asEncounterId(s: string): EncounterId {
  return s as EncounterId;
}

// ---------------------------------------------------------------------------
// Combat state
// ---------------------------------------------------------------------------

export type CombatState =
  | "idle"
  | "walking"
  | "combat"
  | "victory"
  | "defeat"
  | "paused";

// ---------------------------------------------------------------------------
// Encounter definition
// ---------------------------------------------------------------------------

export interface EnemySpawn {
  readonly entityId: EntityId;
}

export interface EncounterDefinition {
  readonly id: EncounterId;
  readonly enemies: readonly EnemySpawn[];
}

// ---------------------------------------------------------------------------
// Session data (read-only snapshot)
// ---------------------------------------------------------------------------

export interface CombatSessionData {
  readonly sessionId: CombatSessionId;
  readonly encounterId: EncounterId;
  readonly state: CombatState;
  readonly participants: {
    readonly hero: EntityId;
    readonly enemies: readonly EntityId[];
  };
  readonly elapsedTime: number;
}

// ---------------------------------------------------------------------------
// Result pattern
// ---------------------------------------------------------------------------

export type CombatResult<T> =
  | { readonly ok: true; readonly value: T }
  | { readonly ok: false; readonly reason: CombatFailureReason };

export type CombatFailureReason =
  | "no_active_session"
  | "session_already_active"
  | "invalid_encounter"
  | "hero_dead"
  | "combat_in_progress"
  | "not_in_combat";

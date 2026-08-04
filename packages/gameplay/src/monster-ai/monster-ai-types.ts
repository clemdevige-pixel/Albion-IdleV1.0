import type { EntityId } from "@game/core";
import type { AbilityId } from "../abilities/types.js";
import type { MonsterInstanceId } from "../monsters/types.js";

// ---------------------------------------------------------------------------
// AI behavior states
// ---------------------------------------------------------------------------

export type MonsterAIBehaviorState = "idle" | "seeking" | "attacking" | "dead";

// ---------------------------------------------------------------------------
// Action types the AI can decide to take
// ---------------------------------------------------------------------------

export type MonsterAIActionType = "auto_attack" | "ability" | "none";

export interface MonsterAIAction {
  readonly type: MonsterAIActionType;
  readonly abilityId?: AbilityId | undefined;
}

// ---------------------------------------------------------------------------
// Decision context — all data needed for one AI decision cycle
// ---------------------------------------------------------------------------

export interface MonsterAIDecisionContext {
  readonly monsterInstanceId: MonsterInstanceId;
  readonly monsterEntityId: EntityId;
  readonly isAlive: boolean;
  readonly isStunned: boolean;
  readonly isSilenced: boolean;
  readonly currentTarget: EntityId | null;
  readonly isTargetValid: boolean;
  readonly isAutoAttacking: boolean;
  readonly readyAbilityIds: readonly AbilityId[];
}

// ---------------------------------------------------------------------------
// Decision result — what the AI decided to do
// ---------------------------------------------------------------------------

export interface MonsterAIDecisionResult {
  readonly monsterInstanceId: MonsterInstanceId;
  readonly monsterEntityId: EntityId;
  readonly previousState: MonsterAIBehaviorState;
  readonly newState: MonsterAIBehaviorState;
  readonly action: MonsterAIAction;
}

// ---------------------------------------------------------------------------
// Per-monster AI state tracked by the controller
// ---------------------------------------------------------------------------

export interface MonsterAIEntry {
  readonly monsterInstanceId: MonsterInstanceId;
  readonly monsterEntityId: EntityId;
  behaviorState: MonsterAIBehaviorState;
}

// ---------------------------------------------------------------------------
// Result pattern
// ---------------------------------------------------------------------------

export type MonsterAIFailureReason =
  | "monster_not_registered"
  | "monster_already_registered"
  | "monster_dead";

export type MonsterAIResult<T> =
  | { readonly ok: true; readonly value: T }
  | { readonly ok: false; readonly reason: MonsterAIFailureReason };

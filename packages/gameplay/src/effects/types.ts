import type { Brand, EntityId } from "@game/core";

// ---------------------------------------------------------------------------
// Branded identifiers
// ---------------------------------------------------------------------------

export type StatusEffectId = Brand<string, "StatusEffectId">;

export function asStatusEffectId(s: string): StatusEffectId {
  return s as StatusEffectId;
}

// ---------------------------------------------------------------------------
// Effect taxonomy
// ---------------------------------------------------------------------------

export type StatusEffectType =
  | "buff"
  | "debuff"
  | "stun"
  | "root"
  | "slow"
  | "silence";

export type ModifierCategory =
  | "damage"
  | "armor"
  | "magic_resistance"
  | "movement_speed"
  | "attack_speed";

// ---------------------------------------------------------------------------
// Definitions & runtime state
// ---------------------------------------------------------------------------

export interface StatusEffectDefinition {
  readonly id: string;
  readonly effectType: StatusEffectType;
  readonly duration: number;
  readonly strength: number;
  readonly modifierCategory?: ModifierCategory | undefined;
  readonly refreshOnReapply: boolean;
}

export interface ActiveStatusEffect {
  readonly id: StatusEffectId;
  readonly effectType: StatusEffectType;
  readonly source: EntityId;
  readonly target: EntityId;
  readonly definition: StatusEffectDefinition;
  readonly remainingDuration: number;
  readonly strength: number;
  readonly appliedAt: number;
}

export interface ExpiredEffect {
  readonly effect: ActiveStatusEffect;
}

// ---------------------------------------------------------------------------
// Result pattern
// ---------------------------------------------------------------------------

export type StatusEffectFailure =
  | "invalid_effect"
  | "invalid_target"
  | "invalid_source"
  | "invalid_duration"
  | "target_dead"
  | "effect_not_found";

export type StatusEffectResult<T> =
  | { readonly ok: true; readonly value: T }
  | { readonly ok: false; readonly reason: StatusEffectFailure };

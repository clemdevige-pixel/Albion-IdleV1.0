import type { Brand, EntityId } from "@game/core";
import type { DamageType } from "../damage/types.js";

export type AbilityId = Brand<string, "AbilityId">;

export type AbilityState = "ready" | "casting" | "cooldown" | "disabled";

export type AbilityCategory = "basic_attack" | "active" | "passive";

export type AbilityTargetRule = "current_target" | "self" | "nearest_enemy";

export interface AbilityDefinitionLike {
  readonly id: string;
  readonly cooldown: number;
  readonly castTime: number;
  readonly resourceCost: { readonly energy?: number; readonly health?: number };
  readonly interruptible: boolean;
  readonly category?: AbilityCategory | undefined;
  readonly range?: number | undefined;
  readonly damageType?: DamageType | undefined;
  readonly damageMultiplier?: number | undefined;
  readonly targetRule?: AbilityTargetRule | undefined;
}

export interface AbilityEntry {
  readonly abilityId: AbilityId;
  state: AbilityState;
  cooldownRemaining: number;
  castTimeRemaining: number;
  readonly definition: AbilityDefinitionLike;
}

export interface AbilityIntent {
  readonly entityId: EntityId;
  readonly abilityId: AbilityId;
  readonly primaryTarget?: EntityId | undefined;
  readonly tick: number;
}

export type AbilityExecutionFailure =
  | "ability_not_found"
  | "ability_not_ready"
  | "ability_locked"
  | "entity_dead"
  | "entity_stunned"
  | "entity_silenced"
  | "no_target"
  | "target_out_of_range"
  | "insufficient_resources";

export type AbilityExecutionResult =
  | { readonly ok: true; readonly value: { readonly abilityId: AbilityId; readonly target?: EntityId | undefined; readonly damageDealt?: number | undefined } }
  | { readonly ok: false; readonly reason: AbilityExecutionFailure };

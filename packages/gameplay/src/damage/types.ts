import type { EntityId } from "@game/core";
import type { DamageContext } from "./damage-context.js";

export type DamageType = "physical" | "magical" | "true";
export type DamageSourceType = "auto_attack" | "ability" | "effect" | "other";

export interface DamageRequest {
  readonly source: EntityId;
  readonly target: EntityId;
  readonly baseDamage: number;
  readonly damageType: DamageType;
  readonly source_type: DamageSourceType;
  readonly context?: DamageContext | undefined;
}

export interface DamageResult {
  readonly source: EntityId;
  readonly target: EntityId;
  readonly rawDamage: number;
  readonly mitigatedDamage: number;
  readonly finalDamage: number;
  readonly overkill: number;
  readonly targetHealthBefore: number;
  readonly targetHealthAfter: number;
  /** Death check performed immediately after health reduction (21_DAMAGE Rule 14). */
  readonly targetDied: boolean;
}

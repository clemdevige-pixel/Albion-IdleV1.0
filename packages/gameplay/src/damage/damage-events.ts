import type { EntityId } from "@game/core";
import type { DamageSourceType, DamageType } from "./types.js";

/** Payload emitted after every successful {@link DamageManager.processDamage}. */
export interface DamageDealtEvent {
  readonly source: EntityId;
  readonly target: EntityId;
  readonly damageType: DamageType;
  /** Generic origin of the damage, preserved for presentation/logging consumers. */
  readonly sourceType: DamageSourceType;
  readonly rawDamage: number;
  readonly finalDamage: number;
  readonly targetHealthAfter: number;
}

/** Payload emitted when a target's health reaches zero. */
export interface EntityKilledEvent {
  readonly source: EntityId;
  readonly target: EntityId;
  readonly damageType: DamageType;
  readonly overkill: number;
}

/** Payload emitted whenever an entity's health value changes. */
export interface HealthChangedEvent {
  readonly entityId: EntityId;
  readonly previousHealth: number;
  readonly newHealth: number;
  readonly maxHealth: number;
}

/** Payload emitted after a successful heal. */
export interface HealAppliedEvent {
  readonly entityId: EntityId;
  readonly amount: number;
  readonly newHealth: number;
}

/** Event map for `EventBus<DamageEventMap>`. */
export interface DamageEventMap {
  DamageDealt: DamageDealtEvent;
  EntityKilled: EntityKilledEvent;
  HealthChanged: HealthChangedEvent;
  HealApplied: HealAppliedEvent;
}

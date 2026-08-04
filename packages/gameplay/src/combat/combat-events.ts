import type { EntityId } from "@game/core";
import type { DamageResult } from "../damage/types.js";
import type { CombatSessionId, EncounterId } from "./types.js";

// ---------------------------------------------------------------------------
// Event payloads
// ---------------------------------------------------------------------------

export interface CombatStartedEvent {
  readonly sessionId: CombatSessionId;
  readonly encounterId: EncounterId;
  readonly hero: EntityId;
  readonly enemies: readonly EntityId[];
}

export interface CombatEndedEvent {
  readonly sessionId: CombatSessionId;
  readonly result: "victory" | "defeat";
  readonly elapsedTime: number;
}

export interface EnemyKilledEvent {
  readonly sessionId: CombatSessionId;
  readonly entityId: EntityId;
}

export interface HeroKilledEvent {
  readonly sessionId: CombatSessionId;
  readonly entityId: EntityId;
}

export interface AttackExecutedEvent {
  readonly sessionId: CombatSessionId;
  readonly source: EntityId;
  readonly target: EntityId;
  readonly damage: DamageResult;
}

// ---------------------------------------------------------------------------
// Event map (for EventBus<CombatEventMap>)
// ---------------------------------------------------------------------------

export interface CombatEventMap {
  combatStarted: CombatStartedEvent;
  combatEnded: CombatEndedEvent;
  enemyKilled: EnemyKilledEvent;
  heroKilled: HeroKilledEvent;
  attackExecuted: AttackExecutedEvent;
}

// ---------------------------------------------------------------------------
// Tick event (returned by CombatService.tickCombat)
// ---------------------------------------------------------------------------

export type CombatTickEvent =
  | { readonly type: "attack"; readonly data: AttackExecutedEvent }
  | { readonly type: "enemyKilled"; readonly data: EnemyKilledEvent }
  | { readonly type: "heroKilled"; readonly data: HeroKilledEvent }
  | { readonly type: "combatEnded"; readonly data: CombatEndedEvent };

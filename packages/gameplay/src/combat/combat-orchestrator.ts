import type { EntityId } from "@game/core";
import type { AbilityManager } from "../abilities/ability-manager.js";
import type { AbilityId, AbilityExecutionResult } from "../abilities/types.js";
import type { EffectManager } from "../effects/effect-manager.js";
import type { StatusEffectDefinition, StatusEffectResult, ActiveStatusEffect, ExpiredEffect } from "../effects/types.js";
import type { CombatService } from "./combat-service.js";
import type {
  CombatResult,
  CombatSessionData,
  CombatState,
  EncounterDefinition,
  CombatSessionId,
} from "./types.js";
import type { CombatTickEvent } from "./combat-events.js";

// ---------------------------------------------------------------------------
// Orchestrator state snapshot
// ---------------------------------------------------------------------------

export interface CombatOrchestratorState {
  readonly inCombat: boolean;
  readonly session: CombatSessionData | undefined;
  readonly activeEffects: ReadonlyMap<EntityId, readonly ActiveStatusEffect[]>;
}

// ---------------------------------------------------------------------------
// Orchestrated tick result
// ---------------------------------------------------------------------------

export interface OrchestratedTickResult {
  readonly state: CombatState;
  readonly combatEvents: readonly CombatTickEvent[];
  readonly expiredEffects: readonly ExpiredEffect[];
}

// ---------------------------------------------------------------------------
// Dependencies
// ---------------------------------------------------------------------------

export interface CombatOrchestratorDeps {
  readonly combatService: CombatService;
  readonly effectManager: EffectManager;
  readonly abilityManager: AbilityManager;
}

// ---------------------------------------------------------------------------
// CombatOrchestrator
// ---------------------------------------------------------------------------

export class CombatOrchestrator {
  readonly #combat: CombatService;
  readonly #effects: EffectManager;
  readonly #abilities: AbilityManager;

  #initialized = false;
  #unsubscribers: Array<() => void> = [];

  constructor(deps: CombatOrchestratorDeps) {
    this.#combat = deps.combatService;
    this.#effects = deps.effectManager;
    this.#abilities = deps.abilityManager;
  }

  // ── Lifecycle ─────────────────────────────────────────────────────────────

  initialize(): void {
    if (this.#initialized) return;

    // On entity death → remove all effects
    this.#unsubscribers.push(
      this.#combat.events.subscribe("enemyKilled", (e) => {
        this.#effects.removeAllEffects(e.entityId);
      }),
    );
    this.#unsubscribers.push(
      this.#combat.events.subscribe("heroKilled", (e) => {
        this.#effects.removeAllEffects(e.entityId);
      }),
    );

    // On combat ended → clean up effects for all participants
    this.#unsubscribers.push(
      this.#combat.events.subscribe("combatEnded", () => {
        const session = this.#combat.getActiveSession();
        if (session !== undefined) {
          this.#effects.removeAllEffects(session.participants.hero);
          for (const enemy of session.participants.enemies) {
            this.#effects.removeAllEffects(enemy);
          }
        }
      }),
    );

    this.#initialized = true;
  }

  dispose(): void {
    for (const unsub of this.#unsubscribers) {
      unsub();
    }
    this.#unsubscribers = [];
    this.#initialized = false;
  }

  // ── Combat flow ───────────────────────────────────────────────────────────

  startCombat(
    encounter: EncounterDefinition,
    heroEntityId: EntityId,
  ): CombatResult<CombatSessionId> {
    return this.#combat.startEncounter(encounter, heroEntityId);
  }

  endCombat(): CombatResult<CombatSessionData> {
    return this.#combat.endEncounter();
  }

  // ── Orchestrated tick ─────────────────────────────────────────────────────

  tick(dt: number): CombatResult<OrchestratedTickResult> {
    // 1. Tick effects first (durations, expirations)
    const expiredEffects = this.#effects.tickEffects(dt);

    // 2. Tick combat (auto-attacks, targeting, death checks)
    const combatResult = this.#combat.tickCombat(dt);
    if (!combatResult.ok) {
      return combatResult;
    }

    return {
      ok: true,
      value: {
        state: combatResult.value.state,
        combatEvents: combatResult.value.events,
        expiredEffects,
      },
    };
  }

  // ── Ability integration ───────────────────────────────────────────────────

  applyAbility(
    caster: EntityId,
    abilityId: AbilityId,
  ): AbilityExecutionResult {
    // Stunned entities cannot use any abilities
    if (this.#effects.isStunned(caster)) {
      return { ok: false, reason: "entity_stunned" };
    }

    // Silenced entities cannot use active abilities
    if (this.#effects.isSilenced(caster)) {
      return { ok: false, reason: "entity_silenced" };
    }

    return this.#abilities.executeIntent({
      entityId: caster,
      abilityId,
      tick: 0,
    });
  }

  // ── Effect integration ────────────────────────────────────────────────────

  applyEffect(
    source: EntityId,
    target: EntityId,
    def: StatusEffectDefinition,
    tick: number,
  ): StatusEffectResult<ActiveStatusEffect> {
    return this.#effects.applyEffect(source, target, def, tick);
  }

  // ── State query ───────────────────────────────────────────────────────────

  getState(): CombatOrchestratorState {
    const session = this.#combat.getActiveSession();
    const effectMap = new Map<EntityId, readonly ActiveStatusEffect[]>();

    if (session !== undefined) {
      const hero = session.participants.hero;
      const heroEffects = this.#effects.getActiveEffects(hero);
      if (heroEffects.length > 0) {
        effectMap.set(hero, heroEffects);
      }
      for (const enemy of session.participants.enemies) {
        const enemyEffects = this.#effects.getActiveEffects(enemy);
        if (enemyEffects.length > 0) {
          effectMap.set(enemy, enemyEffects);
        }
      }
    }

    return {
      inCombat: this.#combat.isInCombat(),
      session,
      activeEffects: effectMap,
    };
  }
}

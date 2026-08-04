import type { EntityId } from "@game/core";
import { EventBus } from "@game/core";
import type { AbilityManager } from "../abilities/ability-manager.js";
import type { AbilityId } from "../abilities/types.js";
import type { DeathManager } from "../death/death-manager.js";
import type { EffectManager } from "../effects/effect-manager.js";
import type { AutoAttackManager } from "../auto-attack/auto-attack-manager.js";
import type { TargetManager } from "../targeting/target-manager.js";
import type { MonsterInstanceId } from "../monsters/types.js";
import type { MonsterAIEventMap } from "./monster-ai-events.js";
import type {
  MonsterAIAction,
  MonsterAIBehaviorState,
  MonsterAIDecisionContext,
  MonsterAIDecisionResult,
  MonsterAIEntry,
  MonsterAIResult,
} from "./monster-ai-types.js";

// ---------------------------------------------------------------------------
// Dependencies
// ---------------------------------------------------------------------------

export interface MonsterAIControllerDeps {
  readonly deathManager: DeathManager;
  readonly effectManager: EffectManager;
  readonly abilityManager: AbilityManager;
  readonly autoAttackManager: AutoAttackManager;
  readonly targetManager: TargetManager;
}

// ---------------------------------------------------------------------------
// MonsterAIController
// ---------------------------------------------------------------------------

/**
 * Ticks AI decisions for registered monster instances.
 *
 * Each tick, every registered monster goes through a deterministic decision
 * cycle: build context -> select target -> select action -> transition state.
 *
 * Pure gameplay — no React/Phaser dependency.
 */
export class MonsterAIController {
  readonly events: EventBus<MonsterAIEventMap> = new EventBus<MonsterAIEventMap>();

  readonly #deps: MonsterAIControllerDeps;
  readonly #entries = new Map<MonsterInstanceId, MonsterAIEntry>();

  constructor(deps: MonsterAIControllerDeps) {
    this.#deps = deps;
  }

  // ── Registration ─────────────────────────────────────────────────────────

  register(
    monsterInstanceId: MonsterInstanceId,
    monsterEntityId: EntityId,
  ): MonsterAIResult<MonsterAIEntry> {
    if (this.#entries.has(monsterInstanceId)) {
      return { ok: false, reason: "monster_already_registered" };
    }

    const entry: MonsterAIEntry = {
      monsterInstanceId,
      monsterEntityId,
      behaviorState: "idle",
    };
    this.#entries.set(monsterInstanceId, entry);
    return { ok: true, value: entry };
  }

  unregister(monsterInstanceId: MonsterInstanceId): MonsterAIResult<void> {
    if (!this.#entries.has(monsterInstanceId)) {
      return { ok: false, reason: "monster_not_registered" };
    }
    this.#entries.delete(monsterInstanceId);
    return { ok: true, value: undefined };
  }

  // ── Queries ──────────────────────────────────────────────────────────────

  getEntry(monsterInstanceId: MonsterInstanceId): MonsterAIEntry | undefined {
    return this.#entries.get(monsterInstanceId);
  }

  getBehaviorState(monsterInstanceId: MonsterInstanceId): MonsterAIBehaviorState | undefined {
    return this.#entries.get(monsterInstanceId)?.behaviorState;
  }

  registeredCount(): number {
    return this.#entries.size;
  }

  // ── Tick ──────────────────────────────────────────────────────────────────

  /**
   * Process one AI decision cycle for all registered monsters.
   * Returns the decisions made this tick.
   */
  tick(): readonly MonsterAIDecisionResult[] {
    const results: MonsterAIDecisionResult[] = [];

    for (const entry of this.#entries.values()) {
      const result = this.#tickEntry(entry);
      if (result !== null) {
        results.push(result);
      }
    }

    return results;
  }

  /**
   * Process one AI decision cycle for a single monster.
   */
  tickOne(monsterInstanceId: MonsterInstanceId): MonsterAIResult<MonsterAIDecisionResult> {
    const entry = this.#entries.get(monsterInstanceId);
    if (entry === undefined) {
      return { ok: false, reason: "monster_not_registered" };
    }

    const result = this.#tickEntry(entry);
    if (result === null) {
      // Monster is dead — no decision produced
      return { ok: false, reason: "monster_dead" };
    }

    return { ok: true, value: result };
  }

  // ── Internal decision pipeline ───────────────────────────────────────────

  #tickEntry(entry: MonsterAIEntry): MonsterAIDecisionResult | null {
    const context = this.#buildContext(entry);

    // Dead monsters make no decisions
    if (!context.isAlive) {
      const previousState = entry.behaviorState;
      if (previousState !== "dead") {
        entry.behaviorState = "dead";
        this.events.publish("monsterAIStateChanged", {
          monsterInstanceId: entry.monsterInstanceId,
          monsterEntityId: entry.monsterEntityId,
          previousState,
          newState: "dead",
        });
      }
      return null;
    }

    // Stunned monsters skip their decision cycle entirely
    if (context.isStunned) {
      return {
        monsterInstanceId: entry.monsterInstanceId,
        monsterEntityId: entry.monsterEntityId,
        previousState: entry.behaviorState,
        newState: entry.behaviorState,
        action: { type: "none" },
      };
    }

    // Target selection
    const targetResult = this.#resolveTarget(context);

    // State transition + action selection
    const previousState = entry.behaviorState;
    let newState: MonsterAIBehaviorState;
    let action: MonsterAIAction;

    if (!targetResult.hasTarget) {
      // No valid target — go idle
      newState = "idle";
      action = { type: "none" };

      if (previousState !== "idle") {
        this.events.publish("monsterAITargetLost", {
          monsterInstanceId: entry.monsterInstanceId,
          monsterEntityId: entry.monsterEntityId,
        });
      }
    } else {
      // Has target — determine action
      newState = "attacking";

      if (previousState === "idle" || previousState === "seeking") {
        // Just acquired a target — emit event
        this.events.publish("monsterAITargetAcquired", {
          monsterInstanceId: entry.monsterInstanceId,
          monsterEntityId: entry.monsterEntityId,
          targetEntityId: targetResult.targetEntityId,
        });
      }

      action = this.#selectAction(context);
    }

    entry.behaviorState = newState;

    if (previousState !== newState) {
      this.events.publish("monsterAIStateChanged", {
        monsterInstanceId: entry.monsterInstanceId,
        monsterEntityId: entry.monsterEntityId,
        previousState,
        newState,
      });
    }

    if (action.type !== "none") {
      this.events.publish("monsterAIActionSelected", {
        monsterInstanceId: entry.monsterInstanceId,
        monsterEntityId: entry.monsterEntityId,
        action,
      });
    }

    return {
      monsterInstanceId: entry.monsterInstanceId,
      monsterEntityId: entry.monsterEntityId,
      previousState,
      newState,
      action,
    };
  }

  #buildContext(entry: MonsterAIEntry): MonsterAIDecisionContext {
    const entityId = entry.monsterEntityId;
    const isAlive = !this.#deps.deathManager.isDead(entityId);
    const isStunned = this.#deps.effectManager.isStunned(entityId);
    const isSilenced = this.#deps.effectManager.isSilenced(entityId);
    const currentTarget = this.#deps.targetManager.getTarget(entityId);
    const isTargetValid = currentTarget !== null && this.#deps.targetManager.isTargetValid(entityId);
    const isAutoAttacking = this.#deps.autoAttackManager.isAutoAttacking(entityId);

    // Collect ready ability IDs (non-passive, non-basic_attack)
    const readyAbilityIds: AbilityId[] = [];
    try {
      const abilities = this.#deps.abilityManager.getAbilities(entityId);
      for (const entry of abilities) {
        if (entry.state === "ready") {
          const category = entry.definition.category ?? "active";
          if (category === "active") {
            readyAbilityIds.push(entry.abilityId);
          }
        }
      }
    } catch {
      // Entity may not have abilities component — that's fine
    }

    return {
      monsterInstanceId: entry.monsterInstanceId,
      monsterEntityId: entityId,
      isAlive,
      isStunned,
      isSilenced,
      currentTarget,
      isTargetValid,
      isAutoAttacking,
      readyAbilityIds,
    };
  }

  #resolveTarget(
    context: MonsterAIDecisionContext,
  ): { readonly hasTarget: true; readonly targetEntityId: EntityId } | { readonly hasTarget: false } {
    // If current target is still valid, keep it
    if (context.isTargetValid && context.currentTarget !== null) {
      return { hasTarget: true, targetEntityId: context.currentTarget };
    }

    // Current target is invalid — the combat service handles re-targeting
    // through its own tick. We just report whether there is a target.
    const target = this.#deps.targetManager.getTarget(context.monsterEntityId);
    if (target !== null && this.#deps.targetManager.isTargetValid(context.monsterEntityId)) {
      return { hasTarget: true, targetEntityId: target };
    }

    return { hasTarget: false };
  }

  #selectAction(context: MonsterAIDecisionContext): MonsterAIAction {
    // If silenced, can only auto-attack
    if (context.isSilenced) {
      return { type: "auto_attack" };
    }

    // If there are ready abilities, pick the first one (deterministic)
    if (context.readyAbilityIds.length > 0) {
      return { type: "ability", abilityId: context.readyAbilityIds[0] };
    }

    // Default to auto-attack
    return { type: "auto_attack" };
  }
}

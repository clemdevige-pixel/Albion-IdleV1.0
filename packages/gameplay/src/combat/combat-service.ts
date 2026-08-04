import type { EntityId } from "@game/core";
import { EventBus } from "@game/core";
import type { AutoAttackManager } from "../auto-attack/auto-attack-manager.js";
import type { DamageManager } from "../damage/damage-manager.js";
import type { DeathManager } from "../death/death-manager.js";
import type { TargetManager } from "../targeting/target-manager.js";
import type { StatsManager } from "../stats/stats-manager.js";
import type { StatId } from "../stats/types.js";
import type { CombatEventMap, CombatTickEvent } from "./combat-events.js";
import { CombatSession } from "./combat-session.js";
import { transitionCombatState } from "./combat-state-machine.js";
import type {
  CombatResult,
  CombatSessionData,
  CombatSessionId,
  CombatState,
  EncounterDefinition,
} from "./types.js";
import { asCombatSessionId } from "./types.js";

const PHYSICAL_DAMAGE_STAT = "stat_physical_damage" as StatId;
const MAGICAL_DAMAGE_STAT = "stat_magical_damage" as StatId;

export class CombatService {
  readonly events: EventBus<CombatEventMap> = new EventBus<CombatEventMap>();
  #session: CombatSession | undefined;
  #sessionCounter = 0;

  constructor(
    private readonly damageManager: DamageManager,
    private readonly deathManager: DeathManager,
    private readonly targetManager: TargetManager,
    private readonly autoAttackManager: AutoAttackManager,
    private readonly statsManager: StatsManager,
  ) {}

  // ── Public API ────────────────────────────────────────────────────────────

  startEncounter(
    encounter: EncounterDefinition,
    heroEntityId: EntityId,
  ): CombatResult<CombatSessionId> {
    if (this.#session !== undefined) {
      return { ok: false, reason: "session_already_active" };
    }

    if (encounter.enemies.length === 0) {
      return { ok: false, reason: "invalid_encounter" };
    }

    if (this.deathManager.isDead(heroEntityId)) {
      return { ok: false, reason: "hero_dead" };
    }

    const sessionId = this.#nextSessionId();
    const enemyIds = encounter.enemies.map((e) => e.entityId);

    this.#session = CombatSession.create(sessionId, encounter.id, heroEntityId, enemyIds);

    // Select nearest target for hero and start auto-attack
    this.targetManager.selectNearestTarget(heroEntityId, enemyIds);
    this.autoAttackManager.startAutoAttack(heroEntityId);

    // Start auto-attack for each enemy targeting the hero
    for (const enemyId of enemyIds) {
      this.targetManager.setTarget(enemyId, heroEntityId);
      this.autoAttackManager.startAutoAttack(enemyId);
    }

    this.events.publish("combatStarted", {
      sessionId,
      encounterId: encounter.id,
      hero: heroEntityId,
      enemies: enemyIds,
    });

    return { ok: true, value: sessionId };
  }

  tickCombat(
    deltaTime: number,
  ): CombatResult<{ readonly state: CombatState; readonly events: readonly CombatTickEvent[] }> {
    const session = this.#session;
    if (session === undefined) {
      return { ok: false, reason: "no_active_session" };
    }
    if (session.getState() !== "combat") {
      return { ok: false, reason: "not_in_combat" };
    }

    session.tick(deltaTime);
    const tickEvents: CombatTickEvent[] = [];

    const hero = session.hero;
    const enemies = session.enemies;

    // Tick hero auto-attack
    this.#tickEntity(session, hero, enemies, deltaTime, tickEvents);

    // Tick each alive enemy
    for (const enemyId of enemies) {
      if (this.deathManager.isDead(enemyId)) continue;
      this.#tickEntity(session, enemyId, [hero], deltaTime, tickEvents);
    }

    // Check for victory / defeat
    const heroIsDead = this.deathManager.isDead(hero);
    const allEnemiesDead = enemies.every((e) => this.deathManager.isDead(e));

    if (heroIsDead) {
      transitionCombatState(session, "defeat");
      const endedEvent = {
        sessionId: session.sessionId,
        result: "defeat" as const,
        elapsedTime: session.getElapsedTime(),
      };
      tickEvents.push({ type: "combatEnded", data: endedEvent });
      this.events.publish("combatEnded", endedEvent);
    } else if (allEnemiesDead) {
      transitionCombatState(session, "victory");
      const endedEvent = {
        sessionId: session.sessionId,
        result: "victory" as const,
        elapsedTime: session.getElapsedTime(),
      };
      tickEvents.push({ type: "combatEnded", data: endedEvent });
      this.events.publish("combatEnded", endedEvent);
    }

    return { ok: true, value: { state: session.getState(), events: tickEvents } };
  }

  getActiveSession(): CombatSessionData | undefined {
    return this.#session?.toData();
  }

  endEncounter(): CombatResult<CombatSessionData> {
    const session = this.#session;
    if (session === undefined) {
      return { ok: false, reason: "no_active_session" };
    }
    const state = session.getState();
    if (state !== "victory" && state !== "defeat") {
      return { ok: false, reason: "combat_in_progress" };
    }

    // Stop all auto-attacks
    this.autoAttackManager.stopAutoAttack(session.hero);
    for (const enemyId of session.enemies) {
      if (!this.deathManager.isDead(enemyId)) {
        this.autoAttackManager.stopAutoAttack(enemyId);
      }
    }

    const data = session.toData();
    this.#session = undefined;
    return { ok: true, value: data };
  }

  /**
   * Abandons an active encounter without producing victory, defeat or rewards.
   * Used by explicit player travel, which must take priority over combat.
   */
  cancelEncounter(): CombatResult<CombatSessionData> {
    const session = this.#session;
    if (session === undefined) {
      return { ok: false, reason: "no_active_session" };
    }

    this.autoAttackManager.stopAutoAttack(session.hero);
    this.targetManager.clearTarget(session.hero);
    for (const enemyId of session.enemies) {
      this.autoAttackManager.stopAutoAttack(enemyId);
      this.targetManager.clearTarget(enemyId);
    }

    const data = session.toData();
    this.#session = undefined;
    return { ok: true, value: data };
  }

  isInCombat(): boolean {
    return this.#session !== undefined && this.#session.getState() === "combat";
  }

  // ── Internals ─────────────────────────────────────────────────────────────

  #nextSessionId(): CombatSessionId {
    this.#sessionCounter += 1;
    return asCombatSessionId(`session_${String(this.#sessionCounter)}`);
  }

  #tickEntity(
    session: CombatSession,
    attackerId: EntityId,
    potentialTargets: readonly EntityId[],
    deltaTime: number,
    tickEvents: CombatTickEvent[],
  ): void {
    if (this.deathManager.isDead(attackerId)) return;

    // Re-target if current target is invalid (dead)
    if (!this.targetManager.hasTarget(attackerId) || !this.targetManager.isTargetValid(attackerId)) {
      this.targetManager.cleanupInvalidTarget(attackerId);
      const newTarget = this.targetManager.selectNearestTarget(attackerId, potentialTargets);
      if (newTarget === null) {
        this.autoAttackManager.stopAutoAttack(attackerId);
        return;
      }
      this.autoAttackManager.startAutoAttack(attackerId);
    }

    const attacked = this.autoAttackManager.tick(attackerId, deltaTime);
    if (!attacked) return;

    const targetId = this.targetManager.getTarget(attackerId);
    if (targetId === null) return;

    const physicalDamage = this.statsManager.getStat(attackerId, PHYSICAL_DAMAGE_STAT).computed;
    const magicalDamage = this.statsManager.getStat(attackerId, MAGICAL_DAMAGE_STAT).computed;
    const damageType = magicalDamage > physicalDamage ? "magical" : "physical";

    const damageResult = this.damageManager.processDamage({
      source: attackerId,
      target: targetId,
      // DamageManager already adds the matching computed offensive stat.
      // Passing it again as base damage would count equipment bonuses twice.
      baseDamage: 0,
      damageType,
      source_type: "auto_attack",
    });

    if (damageResult === null) return;

    const attackEvent = {
      sessionId: session.sessionId,
      source: attackerId,
      target: targetId,
      damage: damageResult,
    };
    tickEvents.push({ type: "attack", data: attackEvent });
    this.events.publish("attackExecuted", attackEvent);

    // Check if target died from this attack
    if (damageResult.targetDied) {
      const deathCheck = this.deathManager.checkDeath(targetId, attackerId);
      if (deathCheck !== null) {
        const isHero = targetId === session.hero;
        if (isHero) {
          const heroEvent = { sessionId: session.sessionId, entityId: targetId };
          tickEvents.push({ type: "heroKilled", data: heroEvent });
          this.events.publish("heroKilled", heroEvent);
        } else {
          const enemyEvent = { sessionId: session.sessionId, entityId: targetId };
          tickEvents.push({ type: "enemyKilled", data: enemyEvent });
          this.events.publish("enemyKilled", enemyEvent);
        }
      }
    }
  }
}

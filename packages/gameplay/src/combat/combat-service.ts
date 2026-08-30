import type { EntityId } from "@game/core";
import { EventBus } from "@game/core";
import type { AutoAttackManager } from "../auto-attack/auto-attack-manager.js";
import type { DamageManager } from "../damage/damage-manager.js";
import type { DamageResult } from "../damage/types.js";
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
const AUTO_ATTACK_BONUS_PHYSICAL_STAT = "stat_auto_attack_bonus_physical_damage" as StatId;
const AUTO_ATTACK_BONUS_MAGICAL_STAT = "stat_auto_attack_bonus_magical_damage" as StatId;

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

  startEncounter(encounter: EncounterDefinition, heroEntityId: EntityId): CombatResult<CombatSessionId> {
    if (this.#session !== undefined) return { ok: false, reason: "session_already_active" };
    if (encounter.enemies.length === 0) return { ok: false, reason: "invalid_encounter" };
    if (this.deathManager.isDead(heroEntityId)) return { ok: false, reason: "hero_dead" };

    const sessionId = this.#nextSessionId();
    const enemyIds = encounter.enemies.map((enemy) => enemy.entityId);
    this.#session = CombatSession.create(sessionId, encounter.id, heroEntityId, enemyIds);
    this.targetManager.selectNearestTarget(heroEntityId, enemyIds);
    this.autoAttackManager.startAutoAttack(heroEntityId);
    for (const enemyId of enemyIds) {
      this.targetManager.setTarget(enemyId, heroEntityId);
      this.autoAttackManager.startAutoAttack(enemyId);
    }
    this.events.publish("combatStarted", { sessionId, encounterId: encounter.id, hero: heroEntityId, enemies: enemyIds });
    return { ok: true, value: sessionId };
  }

  tickCombat(deltaTime: number): CombatResult<{ readonly state: CombatState; readonly events: readonly CombatTickEvent[] }> {
    const session = this.#session;
    if (session === undefined) return { ok: false, reason: "no_active_session" };
    if (session.getState() !== "combat") return { ok: false, reason: "not_in_combat" };

    session.tick(deltaTime);
    const tickEvents: CombatTickEvent[] = [];
    const hero = session.hero;
    const enemies = session.enemies;
    this.#tickEntity(session, hero, enemies, deltaTime, tickEvents);
    for (const enemyId of enemies) {
      if (this.deathManager.isDead(enemyId)) continue;
      this.#tickEntity(session, enemyId, [hero], deltaTime, tickEvents);
    }

    const heroIsDead = this.deathManager.isDead(hero);
    const allEnemiesDead = enemies.every((enemy) => this.deathManager.isDead(enemy));
    // If both sides die on the same combat tick, the encounter objective was completed.
    // Resolve victory first so deterministic simultaneous kills do not become false progression walls.
    if (allEnemiesDead) {
      transitionCombatState(session, "victory");
      const endedEvent = { sessionId: session.sessionId, result: "victory" as const, elapsedTime: session.getElapsedTime() };
      tickEvents.push({ type: "combatEnded", data: endedEvent });
      this.events.publish("combatEnded", endedEvent);
    } else if (heroIsDead) {
      transitionCombatState(session, "defeat");
      const endedEvent = { sessionId: session.sessionId, result: "defeat" as const, elapsedTime: session.getElapsedTime() };
      tickEvents.push({ type: "combatEnded", data: endedEvent });
      this.events.publish("combatEnded", endedEvent);
    }
    return { ok: true, value: { state: session.getState(), events: tickEvents } };
  }

  getActiveSession(): CombatSessionData | undefined { return this.#session?.toData(); }

  endEncounter(): CombatResult<CombatSessionData> {
    const session = this.#session;
    if (session === undefined) return { ok: false, reason: "no_active_session" };
    const state = session.getState();
    if (state !== "victory" && state !== "defeat") return { ok: false, reason: "combat_in_progress" };
    this.autoAttackManager.stopAutoAttack(session.hero);
    for (const enemyId of session.enemies) {
      if (!this.deathManager.isDead(enemyId)) this.autoAttackManager.stopAutoAttack(enemyId);
    }
    const data = session.toData();
    this.#session = undefined;
    return { ok: true, value: data };
  }

  cancelEncounter(): CombatResult<CombatSessionData> {
    const session = this.#session;
    if (session === undefined) return { ok: false, reason: "no_active_session" };
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

  isInCombat(): boolean { return this.#session !== undefined && this.#session.getState() === "combat"; }

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
    const damageResult = this.damageManager.processDamage({ source: attackerId, target: targetId, baseDamage: 0, damageType, source_type: "auto_attack" });
    if (damageResult === null) return;

    let lethalResult: DamageResult = damageResult;
    if (!damageResult.targetDied) {
      const bonusPhysical = this.statsManager.getStat(attackerId, AUTO_ATTACK_BONUS_PHYSICAL_STAT).computed;
      const bonusMagical = this.statsManager.getStat(attackerId, AUTO_ATTACK_BONUS_MAGICAL_STAT).computed;
      const bonusSpecs = [
        { amount: bonusPhysical, outputStat: physicalDamage, damageType: "physical" as const },
        { amount: bonusMagical, outputStat: magicalDamage, damageType: "magical" as const },
      ];
      for (const bonus of bonusSpecs) {
        if (bonus.amount <= 0 || !this.damageManager.isAlive(targetId)) continue;
        const result = this.damageManager.processDamage({
          source: attackerId,
          target: targetId,
          // DamageManager adds the output offensive stat. Subtract it so the
          // authored bonus stat remains the exact extra damage budget.
          baseDamage: bonus.amount - bonus.outputStat,
          damageType: bonus.damageType,
          source_type: "effect",
        });
        if (result?.targetDied === true) lethalResult = result;
      }
    }

    const attackEvent = { sessionId: session.sessionId, source: attackerId, target: targetId, damage: damageResult };
    tickEvents.push({ type: "attack", data: attackEvent });
    this.events.publish("attackExecuted", attackEvent);

    if (lethalResult.targetDied) {
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

import type { EntityId, World, EventBus } from "@game/core";
import type { StatsManager } from "../stats/stats-manager.js";
import type { StatId } from "../stats/types.js";
import { HealthComponent, type HealthData } from "./components.js";
import { calculateDamage } from "./damage-calculator.js";
import type { DamageEventMap } from "./damage-events.js";
import { DamageValidator } from "./damage-validator.js";
import type {
  DamageRequest,
  DamageResult,
  PostMitigationDamageResolver,
} from "./types.js";

const MAX_HEALTH_STAT = "stat_max_health" as StatId;
const PHYSICAL_DAMAGE_STAT = "stat_physical_damage" as StatId;
const MAGICAL_DAMAGE_STAT = "stat_magical_damage" as StatId;
const ARMOR_STAT = "stat_armor" as StatId;
const MAGIC_RESISTANCE_STAT = "stat_magic_resistance" as StatId;
const AUTO_ATTACK_DAMAGE_BONUS_STAT = "stat_auto_attack_damage_bonus" as StatId;
const AUTO_ATTACK_DAMAGE_TAKEN_BONUS_STAT = "stat_auto_attack_damage_taken_bonus" as StatId;
const DAMAGE_TAKEN_BONUS_STAT = "stat_damage_taken_bonus" as StatId;
const LIFE_STEAL_STAT = "stat_life_steal" as StatId;

export class DamageManager {
  readonly #world: World;
  readonly #statsManager: StatsManager;
  readonly #validator: DamageValidator;
  #eventBus: EventBus<DamageEventMap> | undefined;
  #postMitigationResolver: PostMitigationDamageResolver | undefined;

  constructor(world: World, statsManager: StatsManager) {
    this.#world = world;
    this.#statsManager = statsManager;
    this.#validator = new DamageValidator(world);
  }

  setEventBus(bus: EventBus<DamageEventMap>): void {
    this.#eventBus = bus;
  }

  setPostMitigationDamageResolver(resolver: PostMitigationDamageResolver | undefined): void {
    this.#postMitigationResolver = resolver;
  }

  attachHealth(entityId: EntityId): void {
    const maxHealth = this.#statsManager.getStat(entityId, MAX_HEALTH_STAT).computed;
    this.#world.addComponent(entityId, HealthComponent, {
      currentHealth: maxHealth,
      maxHealth,
    });
  }

  detachHealth(entityId: EntityId): void {
    this.#world.removeComponent(entityId, HealthComponent);
  }

  getHealth(entityId: EntityId): HealthData {
    return this.#world.getComponent(entityId, HealthComponent);
  }

  isAlive(entityId: EntityId): boolean {
    return this.#world.getComponent(entityId, HealthComponent).currentHealth > 0;
  }

  processDamage(request: DamageRequest): DamageResult | null {
    if (!this.#validator.validate(request)) return null;

    const attackerStats = {
      physicalDamage: this.#statsManager.getStat(request.source, PHYSICAL_DAMAGE_STAT).computed,
      magicalDamage: this.#statsManager.getStat(request.source, MAGICAL_DAMAGE_STAT).computed,
    };
    const defenderStats = {
      armor: this.#statsManager.getStat(request.target, ARMOR_STAT).computed,
      magicResistance: this.#statsManager.getStat(request.target, MAGIC_RESISTANCE_STAT).computed,
    };

    const offensiveDamage = request.damageType === "magical"
      ? attackerStats.magicalDamage
      : request.damageType === "physical"
        ? attackerStats.physicalDamage
        : 0;
    const isAutoAttack = request.source_type === "auto_attack";
    const autoAttackBonusPercent = isAutoAttack
      ? this.#statsManager.getStat(request.source, AUTO_ATTACK_DAMAGE_BONUS_STAT).computed
      : 0;
    const autoAttackBonusDamage = offensiveDamage * Math.max(0, autoAttackBonusPercent) / 100;
    const autoAttackTakenBonusPercent = isAutoAttack
      ? this.#statsManager.getStat(request.target, AUTO_ATTACK_DAMAGE_TAKEN_BONUS_STAT).computed
      : 0;
    const autoAttackTakenMultiplier = 1 + Math.max(0, autoAttackTakenBonusPercent) / 100;
    const damageTakenBonusPercent = this.#statsManager.getStat(request.target, DAMAGE_TAKEN_BONUS_STAT).computed;
    const damageTakenMultiplier = 1 + Math.max(0, damageTakenBonusPercent) / 100;
    const rawDamageBeforeTargetBonuses = request.baseDamage + autoAttackBonusDamage + offensiveDamage;
    const adjustedRawDamage = rawDamageBeforeTargetBonuses * autoAttackTakenMultiplier * damageTakenMultiplier;
    const baseDamage = adjustedRawDamage - offensiveDamage;

    const calc = calculateDamage(
      baseDamage,
      attackerStats,
      defenderStats,
      request.damageType,
    );

    if (calc.rawDamage <= 0) return null;

    const resolvedDamage = this.#postMitigationResolver?.(request, calc.mitigatedDamage)
      ?? calc.mitigatedDamage;
    if (!Number.isFinite(resolvedDamage) || resolvedDamage < 0) {
      throw new Error("Post-mitigation damage resolver must return a finite non-negative value");
    }

    const health = this.getHealth(request.target);
    const healthBefore = health.currentHealth;
    const finalDamage = Math.min(resolvedDamage, healthBefore);
    const overkill = Math.max(0, resolvedDamage - healthBefore);

    health.currentHealth = Math.max(0, healthBefore - resolvedDamage);

    const targetDied = health.currentHealth <= 0;

    const result: DamageResult = {
      source: request.source,
      target: request.target,
      rawDamage: calc.rawDamage,
      mitigatedDamage: calc.mitigatedDamage,
      finalDamage,
      overkill,
      targetHealthBefore: healthBefore,
      targetHealthAfter: health.currentHealth,
      targetDied,
    };

    if (this.#eventBus !== undefined) {
      this.#eventBus.publish("HealthChanged", {
        entityId: request.target,
        previousHealth: healthBefore,
        newHealth: health.currentHealth,
        maxHealth: health.maxHealth,
      });
      this.#eventBus.publish("DamageDealt", {
        source: request.source,
        target: request.target,
        damageType: request.damageType,
        sourceType: request.source_type,
        rawDamage: calc.rawDamage,
        finalDamage,
        targetHealthAfter: health.currentHealth,
      });
      if (targetDied) {
        this.#eventBus.publish("EntityKilled", {
          source: request.source,
          target: request.target,
          damageType: request.damageType,
          overkill,
        });
      }
    }

    if (request.source_type === "auto_attack" && this.isAlive(request.source)) {
      const lifeStealPercent = this.#statsManager.getStat(request.source, LIFE_STEAL_STAT).computed;
      if (lifeStealPercent > 0 && finalDamage > 0) {
        this.healDamage(request.source, finalDamage * lifeStealPercent / 100);
      }
    }

    return result;
  }

  applyDamage(entityId: EntityId, amount: number): number {
    const health = this.getHealth(entityId);
    const previousHealth = health.currentHealth;
    const actual = Math.min(amount, health.currentHealth);
    health.currentHealth = Math.max(0, health.currentHealth - amount);

    if (this.#eventBus !== undefined) {
      this.#eventBus.publish("HealthChanged", {
        entityId,
        previousHealth,
        newHealth: health.currentHealth,
        maxHealth: health.maxHealth,
      });
    }

    return actual;
  }

  healDamage(entityId: EntityId, amount: number): number {
    const health = this.getHealth(entityId);
    const previousHealth = health.currentHealth;
    const actual = Math.min(amount, health.maxHealth - health.currentHealth);
    health.currentHealth = Math.min(health.maxHealth, health.currentHealth + amount);

    if (this.#eventBus !== undefined) {
      this.#eventBus.publish("HealthChanged", {
        entityId,
        previousHealth,
        newHealth: health.currentHealth,
        maxHealth: health.maxHealth,
      });
      this.#eventBus.publish("HealApplied", {
        entityId,
        amount: actual,
        newHealth: health.currentHealth,
      });
    }

    return actual;
  }

  syncMaxHealth(entityId: EntityId): void {
    const health = this.getHealth(entityId);
    const previousMax = health.maxHealth;
    const previousCurrent = health.currentHealth;
    const newMax = this.#statsManager.getStat(entityId, MAX_HEALTH_STAT).computed;

    health.maxHealth = newMax;

    if (previousCurrent <= 0) {
      health.currentHealth = 0;
      return;
    }
    if (previousMax <= 0) {
      health.currentHealth = Math.min(previousCurrent, newMax);
      return;
    }

    const ratio = previousCurrent / previousMax;
    const recalculated = Math.round(newMax * ratio);
    health.currentHealth = Math.min(Math.max(recalculated, 0), newMax);
  }
}

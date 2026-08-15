import type { EntityId, World, EventBus } from "@game/core";
import type { StatsManager } from "../stats/stats-manager.js";
import type { StatId } from "../stats/types.js";
import { HealthComponent, type HealthData } from "./components.js";
import { calculateDamage } from "./damage-calculator.js";
import type { DamageEventMap } from "./damage-events.js";
import { DamageValidator } from "./damage-validator.js";
import type { DamageRequest, DamageResult } from "./types.js";

const MAX_HEALTH_STAT = "stat_max_health" as StatId;
const PHYSICAL_DAMAGE_STAT = "stat_physical_damage" as StatId;
const MAGICAL_DAMAGE_STAT = "stat_magical_damage" as StatId;
const ARMOR_STAT = "stat_armor" as StatId;
const MAGIC_RESISTANCE_STAT = "stat_magic_resistance" as StatId;

export class DamageManager {
  readonly #world: World;
  readonly #statsManager: StatsManager;
  readonly #validator: DamageValidator;
  #eventBus: EventBus<DamageEventMap> | undefined;

  constructor(world: World, statsManager: StatsManager) {
    this.#world = world;
    this.#statsManager = statsManager;
    this.#validator = new DamageValidator(world);
  }

  setEventBus(bus: EventBus<DamageEventMap>): void {
    this.#eventBus = bus;
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

    const calc = calculateDamage(
      request.baseDamage,
      attackerStats,
      defenderStats,
      request.damageType,
    );

    if (calc.rawDamage <= 0) return null;

    const health = this.getHealth(request.target);
    const healthBefore = health.currentHealth;
    const finalDamage = Math.min(calc.mitigatedDamage, healthBefore);
    const overkill = Math.max(0, calc.mitigatedDamage - healthBefore);

    health.currentHealth = Math.max(0, healthBefore - calc.mitigatedDamage);

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

import type { EntityId, World } from "@game/core";
import type { EventBus } from "@game/core";
import type { StatsManager } from "../stats/index.js";
import type { StatId } from "../stats/types.js";
import { HealthComponent } from "../damage/components.js";
import { AbilitiesComponent, EnergyComponent } from "./components.js";
import type { AbilityData, EnergyData } from "./components.js";
import { AbilityValidator } from "./ability-validator.js";
import { CastManager } from "./cast-manager.js";
import { CooldownManager } from "./cooldown-manager.js";
import type { AbilityEventMap } from "./ability-events.js";
import type { AbilityDefinitionLike, AbilityEntry, AbilityId, AbilityIntent, AbilityExecutionResult } from "./types.js";

const MAX_ENERGY_STAT = "stat_max_energy" as StatId;

export class AbilityManager {
  readonly #world: World;
  readonly #statsManager: StatsManager;
  readonly #validator: AbilityValidator;
  readonly #castManager = new CastManager();
  readonly #cooldownManager = new CooldownManager();
  #eventBus: EventBus<AbilityEventMap> | undefined;

  constructor(world: World, statsManager: StatsManager) {
    this.#world = world;
    this.#statsManager = statsManager;
    this.#validator = new AbilityValidator(world);
  }

  setEventBus(bus: EventBus<AbilityEventMap>): void {
    this.#eventBus = bus;
  }

  attachAbilities(entityId: EntityId): void {
    const data: AbilityData = { abilities: new Map() };
    this.#world.addComponent(entityId, AbilitiesComponent, data);
    const maxEnergy = this.#statsManager.hasStats(entityId)
      ? this.#statsManager.getStat(entityId, MAX_ENERGY_STAT).computed
      : 0;
    const energy: EnergyData = { currentEnergy: maxEnergy, maxEnergy };
    this.#world.addComponent(entityId, EnergyComponent, energy);
  }

  detachAbilities(entityId: EntityId): void {
    this.#world.removeComponent(entityId, AbilitiesComponent);
    if (this.#world.hasComponent(entityId, EnergyComponent)) {
      this.#world.removeComponent(entityId, EnergyComponent);
    }
  }

  getEnergy(entityId: EntityId): EnergyData {
    return this.#world.getComponent(entityId, EnergyComponent);
  }

  restoreEnergy(entityId: EntityId, amount: number): number {
    const energy = this.getEnergy(entityId);
    const actual = Math.min(amount, energy.maxEnergy - energy.currentEnergy);
    energy.currentEnergy = Math.min(energy.maxEnergy, energy.currentEnergy + amount);
    return actual;
  }

  /**
   * Re-reads maximum energy from stats while preserving the current ratio,
   * mirroring DamageManager.syncMaxHealth.
   */
  syncMaxEnergy(entityId: EntityId): void {
    const energy = this.getEnergy(entityId);
    const previousMax = energy.maxEnergy;
    const previousCurrent = energy.currentEnergy;
    const newMax = this.#statsManager.getStat(entityId, MAX_ENERGY_STAT).computed;

    energy.maxEnergy = newMax;
    if (previousMax <= 0) {
      energy.currentEnergy = Math.min(previousCurrent, newMax);
      return;
    }
    const ratio = previousCurrent / previousMax;
    energy.currentEnergy = Math.min(Math.max(Math.round(newMax * ratio), 0), newMax);
  }

  learnAbility(entityId: EntityId, definition: AbilityDefinitionLike): void {
    const data = this.#getData(entityId);
    const abilityId = definition.id as AbilityId;
    if (data.abilities.has(abilityId)) {
      throw new Error(`Ability "${definition.id}" is already learned`);
    }
    const entry: AbilityEntry = {
      abilityId,
      state: "ready",
      cooldownRemaining: 0,
      castTimeRemaining: 0,
      definition,
    };
    data.abilities.set(abilityId, entry);
    if (definition.category === "passive") {
      this.#eventBus?.publish("PassiveActivated", { entityId, abilityId });
    }
  }

  forgetAbility(entityId: EntityId, abilityId: AbilityId): void {
    const data = this.#getData(entityId);
    const entry = data.abilities.get(abilityId);
    if (!entry) {
      throw new Error(`Ability "${String(abilityId)}" is not known`);
    }
    const isPassive = entry.definition.category === "passive";
    data.abilities.delete(abilityId);
    if (isPassive) {
      this.#eventBus?.publish("PassiveRemoved", { entityId, abilityId });
    }
  }

  castAbility(entityId: EntityId, abilityId: AbilityId): boolean {
    const data = this.#getData(entityId);
    const result = this.#validator.canCast(entityId, data, abilityId);
    if (!result.ok || !result.entry) return false;

    const entry = result.entry;
    this.#deductCosts(entityId, entry);

    if (entry.definition.castTime > 0) {
      this.#castManager.startCast(entry, entry.definition.castTime);
    } else {
      if (entry.definition.cooldown > 0) {
        this.#cooldownManager.startCooldown(entry, entry.definition.cooldown);
      }
    }
    return true;
  }

  interruptCast(entityId: EntityId, abilityId: AbilityId): boolean {
    const data = this.#getData(entityId);
    const entry = data.abilities.get(abilityId);
    if (!entry) return false;
    return this.#castManager.interruptCast(entry);
  }

  tickAbilities(entityId: EntityId, deltaTime: number): void {
    const data = this.#getData(entityId);
    for (const entry of data.abilities.values()) {
      if (entry.state === "casting") {
        const done = this.#castManager.tickCast(entry, deltaTime);
        if (done) {
          if (entry.definition.cooldown > 0) {
            this.#cooldownManager.startCooldown(entry, entry.definition.cooldown);
          } else {
            entry.state = "ready";
            entry.castTimeRemaining = 0;
          }
        }
      } else if (entry.state === "cooldown") {
        const finished = this.#cooldownManager.tickCooldown(entry, deltaTime);
        if (finished) {
          this.#eventBus?.publish("AbilityCooldownFinished", { entityId, abilityId: entry.abilityId });
        }
      }
    }
  }

  getAbilities(entityId: EntityId): readonly AbilityEntry[] {
    return [...this.#getData(entityId).abilities.values()];
  }

  getAbility(entityId: EntityId, abilityId: AbilityId): AbilityEntry | undefined {
    return this.#getData(entityId).abilities.get(abilityId);
  }

  isAbilityReady(entityId: EntityId, abilityId: AbilityId): boolean {
    const entry = this.#getData(entityId).abilities.get(abilityId);
    return entry?.state === "ready";
  }

  hasAbility(entityId: EntityId, abilityId: AbilityId): boolean {
    return this.#getData(entityId).abilities.has(abilityId);
  }

  executeIntent(intent: AbilityIntent): AbilityExecutionResult {
    const { entityId, abilityId } = intent;

    // Check entity alive
    if (this.#world.hasComponent(entityId, HealthComponent)) {
      const health = this.#world.getComponent(entityId, HealthComponent);
      if (health.currentHealth <= 0) {
        return { ok: false, reason: "entity_dead" };
      }
    }

    const data = this.#getData(entityId);
    const entry = data.abilities.get(abilityId);
    if (!entry) {
      return { ok: false, reason: "ability_not_found" };
    }

    if (entry.state !== "ready") {
      return { ok: false, reason: "ability_not_ready" };
    }

    // Passive abilities cannot be "executed"
    const category = entry.definition.category ?? "active";
    if (category === "passive") {
      return { ok: false, reason: "ability_locked" };
    }

    // Resource check
    if (!this.#validator.hasResources(entityId, entry)) {
      return { ok: false, reason: "insufficient_resources" };
    }

    // Deduct costs
    this.#deductCosts(entityId, entry);

    // Start cooldown
    if (entry.definition.cooldown > 0) {
      this.#cooldownManager.startCooldown(entry, entry.definition.cooldown);
      this.#eventBus?.publish("AbilityCooldownStarted", { entityId, abilityId, duration: entry.definition.cooldown });
    }

    // Emit execution event
    this.#eventBus?.publish("AbilityExecuted", {
      entityId,
      abilityId,
      category,
      target: intent.primaryTarget,
    });

    return {
      ok: true,
      value: { abilityId, target: intent.primaryTarget },
    };
  }

  #getData(entityId: EntityId): AbilityData {
    return this.#world.getComponent(entityId, AbilitiesComponent);
  }

  /**
   * Costs consume runtime pools only — current energy and current health.
   * Base statistics are never mutated (AI_BIBLE 11_STAT §5).
   */
  #deductCosts(entityId: EntityId, entry: AbilityEntry): void {
    const cost = entry.definition.resourceCost;
    if (cost.energy !== undefined && cost.energy > 0) {
      const energy = this.#world.getComponent(entityId, EnergyComponent);
      energy.currentEnergy = Math.max(0, energy.currentEnergy - cost.energy);
    }
    if (cost.health !== undefined && cost.health > 0) {
      const health = this.#world.getComponent(entityId, HealthComponent);
      health.currentHealth = Math.max(1, health.currentHealth - cost.health);
    }
  }
}

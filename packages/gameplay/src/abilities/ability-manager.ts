import type { EntityId, World } from "@game/core";
import type { EventBus } from "@game/core";
import type { StatsManager } from "../stats/index.js";
import { HealthComponent } from "../damage/components.js";
import { AbilitiesComponent } from "./components.js";
import type { AbilityData } from "./components.js";
import { AbilityValidator } from "./ability-validator.js";
import { CastManager } from "./cast-manager.js";
import { CooldownManager } from "./cooldown-manager.js";
import type { AbilityEventMap } from "./ability-events.js";
import type { AbilityDefinitionLike, AbilityEntry, AbilityId, AbilityIntent, AbilityExecutionResult } from "./types.js";

export class AbilityManager {
  readonly #world: World;
  readonly #validator: AbilityValidator;
  readonly #castManager = new CastManager();
  readonly #cooldownManager = new CooldownManager();
  #eventBus: EventBus<AbilityEventMap> | undefined;

  constructor(world: World, _statsManager: StatsManager) {
    this.#world = world;
    this.#validator = new AbilityValidator(world);
  }

  setEventBus(bus: EventBus<AbilityEventMap>): void {
    this.#eventBus = bus;
  }

  subscribeAbilityExecuted(
    listener: (event: AbilityEventMap["AbilityExecuted"]) => void,
  ): () => void {
    return this.#eventBus?.subscribe("AbilityExecuted", listener) ?? (() => {});
  }

  attachAbilities(entityId: EntityId): void {
    const data: AbilityData = { abilities: new Map() };
    this.#world.addComponent(entityId, AbilitiesComponent, data);
  }

  detachAbilities(entityId: EntityId): void {
    this.#world.removeComponent(entityId, AbilitiesComponent);
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

  resetCooldowns(entityId: EntityId): void {
    const data = this.#getData(entityId);
    for (const entry of data.abilities.values()) {
      if (entry.state !== "cooldown") continue;
      entry.state = "ready";
      entry.cooldownRemaining = 0;
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

    const category = entry.definition.category ?? "active";
    if (category === "passive") {
      return { ok: false, reason: "ability_locked" };
    }

    if (!this.#validator.hasResources(entityId, entry)) {
      return { ok: false, reason: "insufficient_resources" };
    }

    this.#deductCosts(entityId, entry);

    if (entry.definition.cooldown > 0) {
      this.#cooldownManager.startCooldown(entry, entry.definition.cooldown);
      this.#eventBus?.publish("AbilityCooldownStarted", { entityId, abilityId, duration: entry.definition.cooldown });
    }

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

  #deductCosts(entityId: EntityId, entry: AbilityEntry): void {
    const cost = entry.definition.resourceCost;
    if (cost.health !== undefined && cost.health > 0) {
      const health = this.#world.getComponent(entityId, HealthComponent);
      health.currentHealth = Math.max(1, health.currentHealth - cost.health);
    }
  }
}

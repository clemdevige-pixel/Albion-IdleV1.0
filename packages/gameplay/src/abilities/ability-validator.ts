import type { EntityId, World } from "@game/core";
import { HealthComponent } from "../damage/components.js";
import { EnergyComponent } from "./components.js";
import type { AbilityData } from "./components.js";
import type { AbilityId, AbilityEntry } from "./types.js";

export class AbilityValidator {
  readonly #world: World;

  constructor(world: World) {
    this.#world = world;
  }

  getEntry(data: AbilityData, abilityId: AbilityId): AbilityEntry | undefined {
    return data.abilities.get(abilityId);
  }

  isKnown(data: AbilityData, abilityId: AbilityId): boolean {
    return data.abilities.has(abilityId);
  }

  isReady(entry: AbilityEntry): boolean {
    return entry.state === "ready";
  }

  /**
   * Resource costs are validated against runtime pools (current energy /
   * current health), never against base stats (AI_BIBLE 11_STAT §5,
   * 24_ABILITY_DATA "Resource Cost"). A health cost must leave the caster
   * alive.
   */
  hasResources(entityId: EntityId, entry: AbilityEntry): boolean {
    const cost = entry.definition.resourceCost;
    if (cost.energy !== undefined && cost.energy > 0) {
      if (!this.#world.hasComponent(entityId, EnergyComponent)) return false;
      const energy = this.#world.getComponent(entityId, EnergyComponent);
      if (energy.currentEnergy < cost.energy) return false;
    }
    if (cost.health !== undefined && cost.health > 0) {
      if (!this.#world.hasComponent(entityId, HealthComponent)) return false;
      const health = this.#world.getComponent(entityId, HealthComponent);
      if (health.currentHealth <= cost.health) return false;
    }
    return true;
  }

  canCast(entityId: EntityId, data: AbilityData, abilityId: AbilityId): { ok: boolean; entry?: AbilityEntry } {
    const entry = this.getEntry(data, abilityId);
    if (!entry) return { ok: false };
    if (!this.isReady(entry)) return { ok: false, entry };
    if (!this.hasResources(entityId, entry)) return { ok: false, entry };
    return { ok: true, entry };
  }
}

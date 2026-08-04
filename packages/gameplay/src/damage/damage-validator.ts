import type { World } from "@game/core";
import { HealthComponent } from "./components.js";
import type { DamageRequest } from "./types.js";

/**
 * Damage request validation per AI_BIBLE 21_DAMAGE_SYSTEM:
 * attacker exists, target exists, target has health, target is alive.
 * Invalid requests are discarded with no gameplay effect.
 */
export class DamageValidator {
  readonly #world: World;

  constructor(world: World) {
    this.#world = world;
  }

  validate(request: DamageRequest): boolean {
    if (request.source === request.target) return false;
    if (!this.#world.hasEntity(request.source)) return false;
    if (!this.#world.hasEntity(request.target)) return false;
    if (!this.#world.hasComponent(request.target, HealthComponent)) return false;
    // Target must be alive (21_DAMAGE "Validation": Target Alive).
    if (this.#world.getComponent(request.target, HealthComponent).currentHealth <= 0) return false;
    return true;
  }
}

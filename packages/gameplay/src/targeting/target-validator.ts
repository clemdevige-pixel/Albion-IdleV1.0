import type { EntityId, World } from "@game/core";
import { HealthComponent } from "../damage/components.js";

/**
 * Target validation per AI_BIBLE 20_COMBAT (Rule 14: "Nearest Living Enemy is
 * the default target") and 23_ABILITY "Target Validation": a valid target
 * exists and is alive. Entities without a health component are treated as
 * non-combat entities and remain targetable.
 */
export class TargetValidator {
  constructor(private readonly world: World) {}

  isValid(source: EntityId, target: EntityId): boolean {
    if (source === target) return false;
    if (!this.world.hasEntity(target)) return false;
    if (this.world.hasComponent(target, HealthComponent)) {
      if (this.world.getComponent(target, HealthComponent).currentHealth <= 0) return false;
    }
    return true;
  }
}

import type { EntityId } from "@game/core";
import type { AbilityManager, DamageManager, InventoryManager } from "@game/gameplay";
import {
  HEALTH_POTION_COOLDOWN_SECONDS,
  HEALTH_POTION_HEAL_RATIO,
} from "../data/economyContentCatalog";

export type UseConsumableResult =
  | {
      readonly ok: true;
      readonly itemId: string;
      readonly restored: number;
      readonly currentHealth?: number;
      readonly maxHealth?: number;
    }
  | {
      readonly ok: false;
      readonly reason: "cooldown";
      readonly remainingSeconds: number;
    }
  | {
      readonly ok: false;
      readonly reason: "resource_full";
    }
  | {
      readonly ok: false;
      readonly reason: "not_in_inventory";
    }
  | {
      readonly ok: false;
      readonly reason: "unknown_item";
    };

export interface ConsumableRuntimeState {
  readonly healthPotionCooldown: number;
  readonly healthPotionCooldownRemaining: number;
  readonly healthPotionHealPercent: number;
}

export interface ConsumableRuntimeDependencies {
  readonly inventoryManager: InventoryManager;
  readonly damageManager: DamageManager;
  readonly abilityManager: AbilityManager;
  readonly heroId: EntityId;
}

export class ConsumableRuntime {
  private readonly inventoryManager: InventoryManager;
  private readonly damageManager: DamageManager;
  private readonly abilityManager: AbilityManager;
  private readonly heroId: EntityId;

  private healthPotionCooldownRemaining = 0;

  constructor(deps: ConsumableRuntimeDependencies) {
    this.inventoryManager = deps.inventoryManager;
    this.damageManager = deps.damageManager;
    this.abilityManager = deps.abilityManager;
    this.heroId = deps.heroId;
  }

  public tick(dt: number): boolean {
    if (this.healthPotionCooldownRemaining > 0) {
      this.healthPotionCooldownRemaining = Math.max(
        0,
        this.healthPotionCooldownRemaining - dt,
      );
      return true;
    }
    return false;
  }

  public getState(): ConsumableRuntimeState {
    return {
      healthPotionCooldown: HEALTH_POTION_COOLDOWN_SECONDS,
      healthPotionCooldownRemaining: this.healthPotionCooldownRemaining,
      healthPotionHealPercent: HEALTH_POTION_HEAL_RATIO * 100,
    };
  }

  public useConsumable(itemId: string): UseConsumableResult {
    let availableRestore = 0;
    if (itemId === "item_health_potion") {
      if (this.healthPotionCooldownRemaining > 0) {
        return {
          ok: false,
          reason: "cooldown",
          remainingSeconds: this.healthPotionCooldownRemaining,
        };
      }
      const health = this.damageManager.getHealth(this.heroId);
      availableRestore = Math.min(
        Math.ceil(health.maxHealth * HEALTH_POTION_HEAL_RATIO),
        health.maxHealth - health.currentHealth,
      );
    } else if (itemId === "item_energy_potion") {
      const energy = this.abilityManager.getEnergy(this.heroId);
      availableRestore = Math.min(50, energy.maxEnergy - energy.currentEnergy);
    } else {
      return { ok: false, reason: "unknown_item" };
    }

    if (availableRestore <= 0) {
      return { ok: false, reason: "resource_full" };
    }

    const removed = this.inventoryManager.removeQuantity(this.heroId, itemId, 1);
    if (!removed.ok) {
      return { ok: false, reason: "not_in_inventory" };
    }

    const restored = itemId === "item_health_potion"
      ? this.damageManager.healDamage(this.heroId, availableRestore)
      : this.abilityManager.restoreEnergy(this.heroId, 50);

    if (itemId === "item_health_potion") {
      this.healthPotionCooldownRemaining = HEALTH_POTION_COOLDOWN_SECONDS;
      const health = this.damageManager.getHealth(this.heroId);
      return {
        ok: true,
        itemId,
        restored,
        currentHealth: health.currentHealth,
        maxHealth: health.maxHealth,
      };
    }

    return {
      ok: true,
      itemId,
      restored,
    };
  }
}

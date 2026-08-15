import type { EntityId } from "@game/core";
import type { DamageManager, DeathManager, InventoryManager } from "@game/gameplay";
import {
  HEALTH_POTION_COOLDOWN_SECONDS,
  HEALTH_POTION_HEAL_RATIO,
} from "../data/economyContentCatalog";
import { getCombatSegmentStartGeneration } from "./CombatSegmentLifecycle.js";

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
      readonly reason: "hero_dead";
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
  readonly deathManager: DeathManager;
  readonly heroId: EntityId;
}

export class ConsumableRuntime {
  private readonly inventoryManager: InventoryManager;
  private readonly damageManager: DamageManager;
  private readonly deathManager: DeathManager;
  private readonly heroId: EntityId;

  private healthPotionCooldownRemaining = 0;
  private lastSegmentStartGeneration = getCombatSegmentStartGeneration();

  constructor(deps: ConsumableRuntimeDependencies) {
    this.inventoryManager = deps.inventoryManager;
    this.damageManager = deps.damageManager;
    this.deathManager = deps.deathManager;
    this.heroId = deps.heroId;
  }

  public tick(dt: number): boolean {
    const reset = this.syncSegmentStart();
    if (this.healthPotionCooldownRemaining > 0) {
      this.healthPotionCooldownRemaining = Math.max(
        0,
        this.healthPotionCooldownRemaining - dt,
      );
      return true;
    }
    return reset;
  }

  public getState(): ConsumableRuntimeState {
    this.syncSegmentStart();
    return {
      healthPotionCooldown: HEALTH_POTION_COOLDOWN_SECONDS,
      healthPotionCooldownRemaining: this.healthPotionCooldownRemaining,
      healthPotionHealPercent: HEALTH_POTION_HEAL_RATIO * 100,
    };
  }

  public useConsumable(itemId: string): UseConsumableResult {
    this.syncSegmentStart();

    if (this.deathManager.isDead(this.heroId)) {
      return { ok: false, reason: "hero_dead" };
    }

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

    const restored = this.damageManager.healDamage(this.heroId, availableRestore);

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

  private syncSegmentStart(): boolean {
    const generation = getCombatSegmentStartGeneration();
    if (generation === this.lastSegmentStartGeneration) return false;

    this.lastSegmentStartGeneration = generation;
    const hadCooldown = this.healthPotionCooldownRemaining > 0;
    this.healthPotionCooldownRemaining = 0;
    return hadCooldown;
  }
}

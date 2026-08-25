import type { EntityId } from "@game/core";
import type { DamageManager, DeathManager, InventoryManager } from "@game/gameplay";
import {
  HEALTH_POTION_COOLDOWN_SECONDS,
  HEALTH_POTION_HEAL_RATIO,
} from "../data/economyContentCatalog";
import { combatStopController } from "./CombatStopController.js";
import { getCombatSegmentStartGeneration } from "./CombatSegmentLifecycle.js";

export type UseConsumableResult =
  | {
      readonly ok: true;
      readonly itemId: string;
      readonly restored: number;
      readonly currentHealth?: number;
      readonly maxHealth?: number;
    }
  | { readonly ok: false; readonly reason: "hero_dead" }
  | { readonly ok: false; readonly reason: "combat_inactive" }
  | {
      readonly ok: false;
      readonly reason: "cooldown";
      readonly remainingSeconds: number;
    }
  | { readonly ok: false; readonly reason: "resource_full" }
  | { readonly ok: false; readonly reason: "not_in_inventory" }
  | { readonly ok: false; readonly reason: "unknown_item" };

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
  /** Player composition can consume from Inventory + Bank without coupling this runtime to client storage. */
  readonly consumeItem?: (itemId: string, quantity: number) => boolean;
  /** Optional runtime activity guard for tools/tests. Live runtime defaults to the combat stop controller. */
  readonly isCombatActive?: () => boolean;
}

export class ConsumableRuntime {
  private readonly inventoryManager: InventoryManager;
  private readonly damageManager: DamageManager;
  private readonly deathManager: DeathManager;
  private readonly heroId: EntityId;
  private readonly consumeItem: (itemId: string, quantity: number) => boolean;
  private readonly isCombatActive: () => boolean;

  private healthPotionCooldownRemaining = 0;
  private lastSegmentStartGeneration = getCombatSegmentStartGeneration();

  constructor(deps: ConsumableRuntimeDependencies) {
    this.inventoryManager = deps.inventoryManager;
    this.damageManager = deps.damageManager;
    this.deathManager = deps.deathManager;
    this.heroId = deps.heroId;
    this.consumeItem = deps.consumeItem ?? ((itemId, quantity) => (
      this.inventoryManager.removeQuantity(this.heroId, itemId, quantity).ok
    ));
    this.isCombatActive = deps.isCombatActive ?? (() => !combatStopController.isPaused());
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
    if (!this.isCombatActive()) {
      return { ok: false, reason: "combat_inactive" };
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

    if (!this.consumeItem(itemId, 1)) {
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

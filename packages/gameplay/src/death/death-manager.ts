import type { EntityId, World } from "@game/core";
import type { DamageManager } from "../damage/damage-manager.js";
import { DeathComponent } from "./components.js";
import type { DeathEvent } from "./types.js";

export class DeathManager {
  readonly #world: World;
  readonly #damageManager: DamageManager;

  constructor(world: World, damageManager: DamageManager) {
    this.#world = world;
    this.#damageManager = damageManager;
  }

  attachDeath(entityId: EntityId): void {
    this.#world.addComponent(entityId, DeathComponent, {
      isDead: false,
      processed: false,
      killerEntityId: null,
      deathTick: 0,
    });
  }

  detachDeath(entityId: EntityId): void {
    this.#world.removeComponent(entityId, DeathComponent);
  }

  checkDeath(
    entityId: EntityId,
    killerEntityId?: EntityId,
    tick?: number,
  ): DeathEvent | null {
    const data = this.#world.getComponent(entityId, DeathComponent);
    if (data.isDead) return null;

    if (this.#damageManager.isAlive(entityId)) return null;

    data.isDead = true;
    data.killerEntityId = killerEntityId ?? null;
    data.deathTick = tick ?? 0;

    return {
      entityId,
      killerEntityId: data.killerEntityId,
      timestamp: data.deathTick,
    };
  }

  isDead(entityId: EntityId): boolean {
    return this.#world.getComponent(entityId, DeathComponent).isDead;
  }

  isProcessed(entityId: EntityId): boolean {
    return this.#world.getComponent(entityId, DeathComponent).processed;
  }

  markProcessed(entityId: EntityId): void {
    this.#world.getComponent(entityId, DeathComponent).processed = true;
  }

  getDeathEvent(entityId: EntityId): DeathEvent | null {
    const data = this.#world.getComponent(entityId, DeathComponent);
    if (!data.isDead) return null;
    return {
      entityId,
      killerEntityId: data.killerEntityId,
      timestamp: data.deathTick,
    };
  }
}

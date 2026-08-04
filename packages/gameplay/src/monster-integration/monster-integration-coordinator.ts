import type { EntityId, Unsubscribe } from "@game/core";
import { EventBus } from "@game/core";
import type { MonsterRuntime } from "../monsters/monster-runtime.js";
import type { MonsterInstanceData, MonsterDefinitionId, MonsterInstanceId } from "../monsters/types.js";
import type { MonsterAIController } from "../monster-ai/monster-ai-controller.js";
import type { MonsterSpawnManager } from "../monster-spawn/monster-spawn-manager.js";
import type { CombatService } from "../combat/combat-service.js";
import type { DeathManager } from "../death/death-manager.js";
import type { LootManager } from "../death/loot-manager.js";
import type { LootTransferService } from "../death/loot-transfer.js";
import type { LootTableLike } from "../death/types.js";
import type { ProgressionOrchestrator } from "../progression/progression-orchestrator.js";
import type { TargetManager } from "../targeting/target-manager.js";
import type {
  MonsterIntegrationEventMap,
  MonsterIntegrationResult,
  MonsterKillRewardConfig,
} from "./types.js";

// ---------------------------------------------------------------------------
// Dependencies
// ---------------------------------------------------------------------------

export interface MonsterIntegrationDeps {
  readonly monsterRuntime: MonsterRuntime;
  readonly monsterAI: MonsterAIController;
  readonly spawnManager: MonsterSpawnManager;
  readonly combatService: CombatService;
  readonly deathManager: DeathManager;
  readonly lootManager: LootManager;
  readonly lootTransfer: LootTransferService;
  readonly progressionOrchestrator: ProgressionOrchestrator;
  readonly targetManager: TargetManager;
}

// ---------------------------------------------------------------------------
// MonsterIntegrationCoordinator
// ---------------------------------------------------------------------------

/**
 * Wires all monster subsystems together into a complete lifecycle:
 * spawn → AI register → combat → death → loot → fame → despawn → respawn.
 *
 * Pure integration — no new business logic. Subscribes to events from
 * existing systems and calls their public APIs to connect the dots.
 */
export class MonsterIntegrationCoordinator {
  readonly events: EventBus<MonsterIntegrationEventMap> =
    new EventBus<MonsterIntegrationEventMap>();

  readonly #deps: MonsterIntegrationDeps;
  readonly #unsubscribers: Unsubscribe[] = [];
  readonly #lootTables = new Map<MonsterDefinitionId, LootTableLike>();
  readonly #rewardConfigs = new Map<MonsterDefinitionId, MonsterKillRewardConfig>();
  /** Hero entity that receives loot and fame. */
  #heroEntityId: EntityId | undefined;
  #initialized = false;

  constructor(deps: MonsterIntegrationDeps) {
    this.#deps = deps;
  }

  // ── Configuration ─────────────────────────────────────────────────────────

  /** Sets the hero entity that receives loot and fame from kills. */
  setHeroEntity(heroEntityId: EntityId): void {
    this.#heroEntityId = heroEntityId;
  }

  /** Registers a loot table for a monster definition. */
  registerLootTable(definitionId: MonsterDefinitionId, lootTable: LootTableLike): void {
    this.#lootTables.set(definitionId, lootTable);
  }

  /** Registers kill reward config (fame) for a monster definition. */
  registerRewardConfig(
    definitionId: MonsterDefinitionId,
    config: MonsterKillRewardConfig,
  ): void {
    this.#rewardConfigs.set(definitionId, config);
  }

  // ── Lifecycle ─────────────────────────────────────────────────────────────

  /**
   * Wires all event subscriptions. Call once after all dependencies are set up.
   */
  initialize(): void {
    if (this.#initialized) return;

    // 1. On monster spawned → register with AI controller + attach death component
    this.#unsubscribers.push(
      this.#deps.monsterRuntime.events.subscribe("monsterSpawned", (evt) => {
        this.#onMonsterSpawned(evt.instanceId, evt.entityId);
      }),
    );

    // 2. On enemy killed in combat → process death pipeline (loot + fame + despawn)
    this.#unsubscribers.push(
      this.#deps.combatService.events.subscribe("enemyKilled", (evt) => {
        this.#onEnemyKilled(evt.entityId);
      }),
    );

    // 3. On monster despawned → unregister from AI, cleanup, emit lifecycle complete
    this.#unsubscribers.push(
      this.#deps.monsterRuntime.events.subscribe("monsterDespawned", (evt) => {
        this.#onMonsterDespawned(evt.instanceId, evt.entityId);
      }),
    );

    this.#initialized = true;
  }

  /** Cleanup all event subscriptions. */
  dispose(): void {
    for (const unsub of this.#unsubscribers) {
      unsub();
    }
    this.#unsubscribers.length = 0;
    this.#initialized = false;
  }

  // ── Manual lifecycle triggers ─────────────────────────────────────────────

  /**
   * Processes the death of a monster by instance ID.
   * Called automatically via combat events, but can also be called manually.
   * Handles: kill runtime transition → loot → fame → despawn.
   */
  processMonsterDeath(
    monsterInstanceId: MonsterInstanceId,
    killerEntityId?: EntityId,
  ): MonsterIntegrationResult<void> {
    const instanceResult = this.#deps.monsterRuntime.getInstance(monsterInstanceId);
    if (!instanceResult.ok) {
      return { ok: false, reason: "monster_not_found" };
    }
    const instance = instanceResult.value;

    // Kill in runtime if not already dead
    if (instance.state === "alive") {
      this.#deps.monsterRuntime.kill(monsterInstanceId);
    }

    // Emit kill processed
    this.events.publish("monsterKillProcessed", {
      monsterInstanceId,
      monsterEntityId: instance.entityId,
      killerEntityId: killerEntityId ?? null,
      definitionId: instance.definitionId,
    });

    // Award loot
    this.#awardLoot(instance);

    // Award fame
    this.#awardFame(instance);

    // Despawn
    this.#deps.monsterRuntime.despawn(monsterInstanceId);

    return { ok: true, value: undefined };
  }

  // ── Internal event handlers ───────────────────────────────────────────────

  #onMonsterSpawned(instanceId: MonsterInstanceId, entityId: EntityId): void {
    // Register with AI controller so it gets ticked
    this.#deps.monsterAI.register(instanceId, entityId);

    // Attach death component so DeathManager can track it
    this.#deps.deathManager.attachDeath(entityId);
  }

  #onEnemyKilled(entityId: EntityId): void {
    // Find the monster instance by entity ID
    const instances = this.#deps.monsterRuntime.getAllInstances();
    const instance = instances.find((inst) => inst.entityId === entityId);
    if (instance === undefined) return;

    // Process the full death pipeline
    this.processMonsterDeath(instance.instanceId, this.#heroEntityId);
  }

  #onMonsterDespawned(instanceId: MonsterInstanceId, entityId: EntityId): void {
    // Unregister from AI controller
    this.#deps.monsterAI.unregister(instanceId);

    // Find definition ID for lifecycle event
    const instanceResult = this.#deps.monsterRuntime.getInstance(instanceId);
    const definitionId = instanceResult.ok ? instanceResult.value.definitionId : undefined;

    this.events.publish("monsterDespawnProcessed", {
      monsterInstanceId: instanceId,
      monsterEntityId: entityId,
    });

    if (definitionId !== undefined) {
      this.events.publish("monsterLifecycleComplete", {
        monsterInstanceId: instanceId,
        monsterEntityId: entityId,
        definitionId,
      });
    }
  }

  // ── Loot & Fame ───────────────────────────────────────────────────────────

  #awardLoot(instance: MonsterInstanceData): void {
    if (this.#heroEntityId === undefined) return;

    const lootTable = this.#lootTables.get(instance.definitionId);
    if (lootTable === undefined) return;

    const loot = this.#deps.lootManager.generateLoot(instance.entityId, lootTable);
    const transfer = this.#deps.lootTransfer.transferLoot(this.#heroEntityId, loot);

    this.events.publish("monsterLootAwarded", {
      monsterInstanceId: instance.instanceId,
      monsterEntityId: instance.entityId,
      receiverEntityId: this.#heroEntityId,
      loot,
      transfer,
    });
  }

  #awardFame(instance: MonsterInstanceData): void {
    const rewardConfig = this.#rewardConfigs.get(instance.definitionId);
    if (rewardConfig === undefined) return;

    const result = this.#deps.progressionOrchestrator.onFameEarned(
      rewardConfig.targetMasteryId,
      rewardConfig.fameAmount,
      rewardConfig.category,
    );

    if (result.ok) {
      this.events.publish("monsterFameAwarded", {
        monsterInstanceId: instance.instanceId,
        monsterEntityId: instance.entityId,
        fame: result.value,
      });
    }
  }
}

import type { EntityId, World } from "@game/core";
import type { StatsManager } from "../stats/stats-manager.js";
import { MonsterInstance } from "./monster-instance.js";
import type { MonsterRepository } from "./monster-repository.js";
import type {
  MonsterDefinition,
  MonsterDefinitionId,
  MonsterInstanceId,
  MonsterResult,
} from "./types.js";
import { asMonsterInstanceId } from "./types.js";

/**
 * Creates MonsterInstance objects from definitions.
 * Allocates an ECS entity and attaches stats from the definition.
 */
export class MonsterFactory {
  readonly #world: World;
  readonly #statsManager: StatsManager;
  readonly #repository: MonsterRepository;
  #instanceCounter = 0;

  constructor(world: World, statsManager: StatsManager, repository: MonsterRepository) {
    this.#world = world;
    this.#statsManager = statsManager;
    this.#repository = repository;
  }

  /**
   * Creates a monster instance from a definition ID.
   * Allocates an entity, attaches stats, and returns the live instance.
   */
  create(definitionId: MonsterDefinitionId): MonsterResult<MonsterInstance> {
    const defResult = this.#repository.get(definitionId);
    if (!defResult.ok) {
      return defResult;
    }

    return { ok: true, value: this.#createFromDefinition(defResult.value) };
  }

  #createFromDefinition(definition: MonsterDefinition): MonsterInstance {
    const entityId: EntityId = this.#world.createEntity();
    const instanceId = this.#nextInstanceId();

    // Attach stats component and set base values
    this.#statsManager.attachStats(entityId);
    for (const entry of definition.baseStats) {
      this.#statsManager.setBaseStat(entityId, entry.statId, entry.baseValue);
    }

    return new MonsterInstance(
      instanceId,
      definition.id,
      entityId,
      definition.name,
      definition.tier,
    );
  }

  #nextInstanceId(): MonsterInstanceId {
    this.#instanceCounter += 1;
    return asMonsterInstanceId(`monster_${String(this.#instanceCounter)}`);
  }
}

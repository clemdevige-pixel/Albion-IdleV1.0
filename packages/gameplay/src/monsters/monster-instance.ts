import type { EntityId } from "@game/core";
import { transitionMonsterState } from "./monster-state-machine.js";
import type {
  MonsterDefinitionId,
  MonsterInstanceData,
  MonsterInstanceId,
  MonsterResult,
  MonsterState,
} from "./types.js";

/**
 * A single live monster with mutable state.
 * Created by MonsterFactory, managed by MonsterRuntime.
 */
export class MonsterInstance {
  readonly #instanceId: MonsterInstanceId;
  readonly #definitionId: MonsterDefinitionId;
  readonly #entityId: EntityId;
  readonly #name: string;
  readonly #tier: number;
  #state: MonsterState;

  constructor(
    instanceId: MonsterInstanceId,
    definitionId: MonsterDefinitionId,
    entityId: EntityId,
    name: string,
    tier: number,
  ) {
    this.#instanceId = instanceId;
    this.#definitionId = definitionId;
    this.#entityId = entityId;
    this.#name = name;
    this.#tier = tier;
    this.#state = "alive";
  }

  get instanceId(): MonsterInstanceId {
    return this.#instanceId;
  }

  get definitionId(): MonsterDefinitionId {
    return this.#definitionId;
  }

  get entityId(): EntityId {
    return this.#entityId;
  }

  get state(): MonsterState {
    return this.#state;
  }

  get name(): string {
    return this.#name;
  }

  get tier(): number {
    return this.#tier;
  }

  isAlive(): boolean {
    return this.#state === "alive";
  }

  isDead(): boolean {
    return this.#state === "dead";
  }

  isDespawned(): boolean {
    return this.#state === "despawned";
  }

  /**
   * Attempts a state transition.
   * Returns the new state on success or a failure reason.
   */
  transition(newState: MonsterState): MonsterResult<MonsterState> {
    const result = transitionMonsterState(this.#state, newState);
    if (result.ok) {
      this.#state = newState;
    }
    return result;
  }

  /** Returns a read-only snapshot of this instance. */
  toData(): MonsterInstanceData {
    return {
      instanceId: this.#instanceId,
      definitionId: this.#definitionId,
      entityId: this.#entityId,
      state: this.#state,
      name: this.#name,
      tier: this.#tier,
    };
  }
}

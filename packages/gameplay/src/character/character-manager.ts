import type { World, EntityId } from "@game/core";
import type { CharacterId, CharacterProfile, CharacterState, CharacterStatus } from "./types.js";
import type { CharacterFactory } from "./character-factory.js";
import { ProfileComponent, StateComponent } from "./components.js";
import { transitionState } from "./state-machine.js";

export class CharacterManager {
  readonly #lookup = new Map<CharacterId, EntityId>();

  constructor(
    private readonly world: World,
    private readonly factory: CharacterFactory,
  ) {}

  createCharacter(options: { name: string; tick: number }): CharacterId {
    const { entityId, characterId } = this.factory.create(options);
    this.#lookup.set(characterId, entityId);
    return characterId;
  }

  removeCharacter(characterId: CharacterId): void {
    const entityId = this.#requireEntity(characterId);
    this.factory.remove(entityId);
    this.#lookup.delete(characterId);
  }

  getCharacter(
    characterId: CharacterId,
  ): { entityId: EntityId; profile: CharacterProfile; state: CharacterStatus } | undefined {
    const entityId = this.#lookup.get(characterId);
    if (entityId === undefined) return undefined;
    const profile = this.world.getComponent(entityId, ProfileComponent);
    const state = this.world.getComponent(entityId, StateComponent);
    return { entityId, profile, state };
  }

  listCharacters(): readonly CharacterId[] {
    return [...this.#lookup.keys()];
  }

  hasCharacter(characterId: CharacterId): boolean {
    return this.#lookup.has(characterId);
  }

  getEntityId(characterId: CharacterId): EntityId | undefined {
    return this.#lookup.get(characterId);
  }

  setState(characterId: CharacterId, state: CharacterState): void {
    const entityId = this.#requireEntity(characterId);
    const current = this.world.getComponent(entityId, StateComponent);
    const next = transitionState(current.state, state);
    this.world.setComponent(entityId, StateComponent, { state: next });
  }

  getState(characterId: CharacterId): CharacterState {
    const entityId = this.#requireEntity(characterId);
    return this.world.getComponent(entityId, StateComponent).state;
  }

  /** Re-registers a characterId→entityId mapping (used during load). */
  _register(characterId: CharacterId, entityId: EntityId): void {
    this.#lookup.set(characterId, entityId);
  }

  #requireEntity(characterId: CharacterId): EntityId {
    const entityId = this.#lookup.get(characterId);
    if (entityId === undefined) {
      throw new Error(`Character not found: ${characterId}`);
    }
    return entityId;
  }
}

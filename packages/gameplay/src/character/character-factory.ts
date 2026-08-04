import type { World, EntityId } from "@game/core";
import { createMonotonicIdFactory } from "@game/core";
import type { CharacterId, CharacterProfile, CharacterStatus } from "./types.js";
import {
  IdentityComponent,
  ProfileComponent,
  StateComponent,
  PositionComponent,
  DirectionComponent,
} from "./components.js";

export interface CharacterSaveData {
  readonly characterId: CharacterId;
  readonly name: string;
  readonly createdAtTick: number;
  readonly state: CharacterStatus;
  readonly position: { x: number; y: number };
  readonly direction: "north" | "south" | "east" | "west";
}

const idFactory = createMonotonicIdFactory();

function generateCharacterId(): CharacterId {
  return `char_${idFactory.next()}` as CharacterId;
}

export class CharacterFactory {
  constructor(private readonly world: World) {}

  create(options: { name: string; tick: number }): { entityId: EntityId; characterId: CharacterId } {
    const entityId = this.world.createEntity();
    const characterId = generateCharacterId();
    const profile: CharacterProfile = {
      id: characterId,
      name: options.name,
      createdAtTick: options.tick,
    };

    this.world.addComponent(entityId, IdentityComponent, { characterId, name: options.name });
    this.world.addComponent(entityId, ProfileComponent, profile);
    this.world.addComponent(entityId, StateComponent, { state: "idle" });
    this.world.addComponent(entityId, PositionComponent, { x: 0, y: 0 });
    this.world.addComponent(entityId, DirectionComponent, { direction: "south" });

    return { entityId, characterId };
  }

  remove(entityId: EntityId): void {
    this.world.destroyEntity(entityId);
  }

  restore(entityId: EntityId, data: CharacterSaveData): void {
    this.world.addComponent(entityId, IdentityComponent, {
      characterId: data.characterId,
      name: data.name,
    });
    this.world.addComponent(entityId, ProfileComponent, {
      id: data.characterId,
      name: data.name,
      createdAtTick: data.createdAtTick,
    });
    this.world.addComponent(entityId, StateComponent, { state: data.state.state });
    this.world.addComponent(entityId, PositionComponent, { x: data.position.x, y: data.position.y });
    this.world.addComponent(entityId, DirectionComponent, { direction: data.direction });
  }
}

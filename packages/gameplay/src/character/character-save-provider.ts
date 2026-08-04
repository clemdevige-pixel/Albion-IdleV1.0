import type { SaveProvider } from "@game/persistence";
import type { World } from "@game/core";
import type { CharacterManager } from "./character-manager.js";
import type { CharacterSaveData } from "./character-factory.js";
import {
  IdentityComponent,
  ProfileComponent,
  StateComponent,
  PositionComponent,
  DirectionComponent,
} from "./components.js";

interface CharacterSavePayload {
  characters: CharacterSaveData[];
}

export class CharacterSaveProvider implements SaveProvider {
  readonly providerId = "character";

  constructor(
    private readonly manager: CharacterManager,
    private readonly world: World,
  ) {}

  save(): unknown {
    const characters: CharacterSaveData[] = [];
    for (const characterId of this.manager.listCharacters()) {
      const entityId = this.manager.getEntityId(characterId);
      if (entityId === undefined) continue;

      const profile = this.world.getComponent(entityId, ProfileComponent);
      const state = this.world.getComponent(entityId, StateComponent);
      const position = this.world.getComponent(entityId, PositionComponent);
      const direction = this.world.getComponent(entityId, DirectionComponent);

      characters.push({
        characterId: profile.id,
        name: profile.name,
        createdAtTick: profile.createdAtTick,
        state: { state: state.state },
        position: { x: position.x, y: position.y },
        direction: direction.direction,
      });
    }
    return { characters } satisfies CharacterSavePayload;
  }

  load(data: unknown): void {
    const payload = data as CharacterSavePayload;
    for (const charData of payload.characters) {
      const entityId = this.world.createEntity();
      this.manager._register(charData.characterId, entityId);

      this.world.addComponent(entityId, IdentityComponent, {
        characterId: charData.characterId,
        name: charData.name,
      });
      this.world.addComponent(entityId, ProfileComponent, {
        id: charData.characterId,
        name: charData.name,
        createdAtTick: charData.createdAtTick,
      });
      this.world.addComponent(entityId, StateComponent, { state: charData.state.state });
      this.world.addComponent(entityId, PositionComponent, {
        x: charData.position.x,
        y: charData.position.y,
      });
      this.world.addComponent(entityId, DirectionComponent, { direction: charData.direction });
    }
  }
}

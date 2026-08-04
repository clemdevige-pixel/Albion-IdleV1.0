import { describe, it, expect, beforeEach } from "vitest";
import { World, createRuntimeServices } from "@game/core";
import { CharacterFactory } from "../character-factory.js";
import { CharacterManager } from "../character-manager.js";
import { CharacterSaveProvider } from "../character-save-provider.js";

function createTestWorld(): World {
  return new World(createRuntimeServices());
}

describe("CharacterSaveProvider", () => {
  let world: World;
  let manager: CharacterManager;
  let provider: CharacterSaveProvider;

  beforeEach(() => {
    world = createTestWorld();
    const factory = new CharacterFactory(world);
    manager = new CharacterManager(world, factory);
    provider = new CharacterSaveProvider(manager, world);
  });

  it("serializes characters", () => {
    manager.createCharacter({ name: "Alice", tick: 5 });
    manager.createCharacter({ name: "Bob", tick: 10 });

    const data = provider.save() as { characters: unknown[] };
    expect(data.characters).toHaveLength(2);
  });

  it("restores characters", () => {
    const id1 = manager.createCharacter({ name: "Alice", tick: 5 });
    manager.setState(id1, "moving");

    const saved = provider.save();

    const world2 = createTestWorld();
    const factory2 = new CharacterFactory(world2);
    const manager2 = new CharacterManager(world2, factory2);
    const provider2 = new CharacterSaveProvider(manager2, world2);

    provider2.load(saved);

    expect(manager2.hasCharacter(id1)).toBe(true);
    const char = manager2.getCharacter(id1);
    expect(char).toBeDefined();
    expect(char!.profile.name).toBe("Alice");
    expect(char!.profile.createdAtTick).toBe(5);
    expect(char!.state.state).toBe("moving");
  });

  it("roundtrip: create → save → clear → load → verify", () => {
    const id1 = manager.createCharacter({ name: "Alice", tick: 0 });
    const id2 = manager.createCharacter({ name: "Bob", tick: 1 });
    manager.setState(id1, "busy");

    const saved = provider.save();

    const world2 = createTestWorld();
    const factory2 = new CharacterFactory(world2);
    const manager2 = new CharacterManager(world2, factory2);
    const provider2 = new CharacterSaveProvider(manager2, world2);

    provider2.load(saved);

    expect(manager2.listCharacters()).toHaveLength(2);
    expect(manager2.hasCharacter(id1)).toBe(true);
    expect(manager2.hasCharacter(id2)).toBe(true);
    expect(manager2.getState(id1)).toBe("busy");
    expect(manager2.getState(id2)).toBe("idle");
    expect(manager2.getCharacter(id2)!.profile.name).toBe("Bob");
  });
});

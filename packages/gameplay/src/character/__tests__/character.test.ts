import { describe, it, expect, beforeEach } from "vitest";
import { World, createRuntimeServices } from "@game/core";
import { CharacterFactory } from "../character-factory.js";
import { CharacterManager } from "../character-manager.js";
import { isValidTransition, transitionState } from "../state-machine.js";
import type { CharacterState } from "../types.js";

function createTestWorld(): World {
  return new World(createRuntimeServices());
}

describe("CharacterManager", () => {
  let world: World;
  let manager: CharacterManager;

  beforeEach(() => {
    world = createTestWorld();
    const factory = new CharacterFactory(world);
    manager = new CharacterManager(world, factory);
  });

  it("creates a character with correct profile and idle state", () => {
    const id = manager.createCharacter({ name: "Alice", tick: 0 });
    const char = manager.getCharacter(id);
    expect(char).toBeDefined();
    expect(char!.profile.name).toBe("Alice");
    expect(char!.profile.createdAtTick).toBe(0);
    expect(char!.state.state).toBe("idle");
  });

  it("creates multiple characters with unique IDs", () => {
    const id1 = manager.createCharacter({ name: "Alice", tick: 0 });
    const id2 = manager.createCharacter({ name: "Bob", tick: 1 });
    expect(id1).not.toBe(id2);
  });

  it("removes a character", () => {
    const id = manager.createCharacter({ name: "Alice", tick: 0 });
    manager.removeCharacter(id);
    expect(manager.hasCharacter(id)).toBe(false);
    expect(manager.getCharacter(id)).toBeUndefined();
  });

  it("lists all character IDs", () => {
    const id1 = manager.createCharacter({ name: "Alice", tick: 0 });
    const id2 = manager.createCharacter({ name: "Bob", tick: 1 });
    const list = manager.listCharacters();
    expect(list).toContain(id1);
    expect(list).toContain(id2);
    expect(list).toHaveLength(2);
  });

  it("hasCharacter returns correct boolean", () => {
    const id = manager.createCharacter({ name: "Alice", tick: 0 });
    expect(manager.hasCharacter(id)).toBe(true);
    manager.removeCharacter(id);
    expect(manager.hasCharacter(id)).toBe(false);
  });

  it("transitions idle → moving", () => {
    const id = manager.createCharacter({ name: "Alice", tick: 0 });
    manager.setState(id, "moving");
    expect(manager.getState(id)).toBe("moving");
  });

  it("transitions idle → dead", () => {
    const id = manager.createCharacter({ name: "Alice", tick: 0 });
    manager.setState(id, "dead");
    expect(manager.getState(id)).toBe("dead");
  });

  it("transitions dead → idle (resurrect)", () => {
    const id = manager.createCharacter({ name: "Alice", tick: 0 });
    manager.setState(id, "dead");
    manager.setState(id, "idle");
    expect(manager.getState(id)).toBe("idle");
  });

  it("throws on invalid transition dead → moving", () => {
    const id = manager.createCharacter({ name: "Alice", tick: 0 });
    manager.setState(id, "dead");
    expect(() => manager.setState(id, "moving")).toThrow();
  });

  it("throws on invalid transition dead → busy", () => {
    const id = manager.createCharacter({ name: "Alice", tick: 0 });
    manager.setState(id, "dead");
    expect(() => manager.setState(id, "busy")).toThrow();
  });
});

describe("state machine", () => {
  const states: CharacterState[] = ["idle", "moving", "busy", "dead"];

  const expectedValid: Array<[CharacterState, CharacterState]> = [
    ["idle", "moving"],
    ["idle", "busy"],
    ["idle", "dead"],
    ["moving", "idle"],
    ["moving", "busy"],
    ["moving", "dead"],
    ["busy", "idle"],
    ["busy", "dead"],
    ["dead", "idle"],
  ];

  it("accepts all valid transitions", () => {
    for (const [from, to] of expectedValid) {
      expect(isValidTransition(from, to)).toBe(true);
      expect(transitionState(from, to)).toBe(to);
    }
  });

  it("rejects all invalid transitions", () => {
    const validSet = new Set(expectedValid.map(([f, t]) => `${f}->${t}`));
    for (const from of states) {
      for (const to of states) {
        if (from === to) continue;
        if (!validSet.has(`${from}->${to}`)) {
          expect(isValidTransition(from, to)).toBe(false);
          expect(() => transitionState(from, to)).toThrow();
        }
      }
    }
  });

  it("allows same-state transitions", () => {
    for (const s of states) {
      expect(isValidTransition(s, s)).toBe(true);
      expect(transitionState(s, s)).toBe(s);
    }
  });
});

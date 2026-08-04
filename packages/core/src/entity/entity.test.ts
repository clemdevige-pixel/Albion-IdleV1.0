import { describe, expect, it } from "vitest";
import { createRuntimeServices } from "../runtime/index.js";
import { World } from "../world/world.js";
import {
  TestCounterComponent,
  TestNameComponent,
  TestTagComponent,
} from "../world/test-fixtures.js";
import {
  ComponentAlreadyExistsError,
  ComponentNotFoundError,
  EntityNotFoundError,
} from "./errors.js";

function newWorld(): World {
  return new World(createRuntimeServices({ seed: 1 }));
}

describe("entity lifecycle", () => {
  it("creates entities with unique ids and tracks existence", () => {
    const world = newWorld();
    const a = world.createEntity();
    const b = world.createEntity();
    expect(a).not.toBe(b);
    expect(world.hasEntity(a)).toBe(true);
    expect(world.getEntityCount()).toBe(2);
  });

  it("removes all components on destruction", () => {
    const world = newWorld();
    const e = world.createEntity();
    world.addComponent(e, TestNameComponent, { name: "x" });
    world.addComponent(e, TestTagComponent, { tag: "t" });
    world.destroyEntity(e);
    expect(world.hasEntity(e)).toBe(false);
    expect(world.query(TestNameComponent)).toHaveLength(0);
  });

  it("throws on double destruction and on unknown ids", () => {
    const world = newWorld();
    const e = world.createEntity();
    world.destroyEntity(e);
    expect(() => world.destroyEntity(e)).toThrow(EntityNotFoundError);
  });
});

describe("components", () => {
  it("adds, reads, detects, and optionally reads components", () => {
    const world = newWorld();
    const e = world.createEntity();
    world.addComponent(e, TestCounterComponent, { value: 3 });
    expect(world.hasComponent(e, TestCounterComponent)).toBe(true);
    expect(world.getComponent(e, TestCounterComponent).value).toBe(3);
    expect(world.tryGetComponent(e, TestTagComponent)).toBeUndefined();
  });

  it("distinguishes add (strict) from set (upsert)", () => {
    const world = newWorld();
    const e = world.createEntity();
    world.addComponent(e, TestCounterComponent, { value: 1 });
    expect(() => world.addComponent(e, TestCounterComponent, { value: 2 })).toThrow(
      ComponentAlreadyExistsError,
    );
    world.setComponent(e, TestCounterComponent, { value: 9 });
    expect(world.getComponent(e, TestCounterComponent).value).toBe(9);
  });

  it("removes components and reports absence explicitly", () => {
    const world = newWorld();
    const e = world.createEntity();
    world.addComponent(e, TestTagComponent, { tag: "a" });
    world.removeComponent(e, TestTagComponent);
    expect(world.hasComponent(e, TestTagComponent)).toBe(false);
    expect(() => world.removeComponent(e, TestTagComponent)).toThrow(ComponentNotFoundError);
    expect(() => world.getComponent(e, TestTagComponent)).toThrow(ComponentNotFoundError);
  });

  it("refuses component operations on unknown entities", () => {
    const world = newWorld();
    const ghost = world.createEntity();
    world.destroyEntity(ghost);
    expect(() => world.addComponent(ghost, TestTagComponent, { tag: "a" })).toThrow(
      EntityNotFoundError,
    );
    expect(world.tryGetComponent(ghost, TestTagComponent)).toBeUndefined();
  });
});

import { describe, expect, it } from "vitest";
import { createRuntimeServices } from "../runtime/index.js";
import { World } from "../world/world.js";
import { TestCounterComponent, TestTagComponent } from "../world/test-fixtures.js";

function newWorld(): World {
  return new World(createRuntimeServices());
}

describe("queries", () => {
  it("matches a single component", () => {
    const world = newWorld();
    const a = world.createEntity();
    const b = world.createEntity();
    world.addComponent(a, TestTagComponent, { tag: "a" });
    const result = world.query(TestTagComponent);
    expect(result.map((r) => r.entityId)).toEqual([a]);
    expect(result.map((r) => r.entityId)).not.toContain(b);
  });

  it("matches a conjunction and excludes incomplete entities", () => {
    const world = newWorld();
    const both = world.createEntity();
    const onlyTag = world.createEntity();
    world.addComponent(both, TestTagComponent, { tag: "b" });
    world.addComponent(both, TestCounterComponent, { value: 0 });
    world.addComponent(onlyTag, TestTagComponent, { tag: "o" });

    const result = world.query(TestTagComponent, TestCounterComponent);
    expect(result.map((r) => r.entityId)).toEqual([both]);
    // Components are returned in the requested order and strongly typed.
    const [row] = result;
    expect(row?.components[0].tag).toBe("b");
    expect(row?.components[1].value).toBe(0);
  });

  it("stays consistent after adding, removing, and destroying", () => {
    const world = newWorld();
    const e1 = world.createEntity();
    const e2 = world.createEntity();
    world.addComponent(e1, TestTagComponent, { tag: "1" });
    world.addComponent(e2, TestTagComponent, { tag: "2" });
    expect(world.query(TestTagComponent).map((r) => r.entityId)).toEqual([e1, e2]);

    world.removeComponent(e1, TestTagComponent);
    expect(world.query(TestTagComponent).map((r) => r.entityId)).toEqual([e2]);

    world.destroyEntity(e2);
    expect(world.query(TestTagComponent)).toHaveLength(0);
  });

  it("returns results in stable ascending id order", () => {
    const world = newWorld();
    const ids = [world.createEntity(), world.createEntity(), world.createEntity()];
    for (const id of ids) {
      world.addComponent(id, TestTagComponent, { tag: String(id) });
    }
    const ordered = world.query(TestTagComponent).map((r) => r.entityId);
    expect(ordered).toEqual([...ids].sort((a, b) => a - b));
  });
});

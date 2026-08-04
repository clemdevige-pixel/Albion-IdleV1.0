import { describe, expect, it } from "vitest";
import { GameLoop, createRuntimeServices, systemId } from "../index.js";
import type { RuntimeConfigInput } from "../runtime/index.js";
import type { SimulationSystem } from "../system/system.js";
import { World } from "./world.js";
import { connectWorldToLoop } from "./connect.js";
import { TestCounterComponent, TestTagComponent, makeCounterSystem } from "./test-fixtures.js";

function newWorld(config: RuntimeConfigInput = {}): World {
  return new World(createRuntimeServices(config));
}

describe("world + runtime integration", () => {
  it("Scenario A: a counter system runs each tick via the loop", () => {
    const world = newWorld({ tickRate: 10 });
    const off = connectWorldToLoop(world, world.services.eventBus);
    world.registerSystem(makeCounterSystem());

    const e = world.createEntity();
    world.addComponent(e, TestCounterComponent, { value: 0 });

    const loop = new GameLoop(world.services);
    loop.start();
    for (let i = 0; i < 5; i += 1) {
      loop.tick();
    }
    off();

    expect(world.getComponent(e, TestCounterComponent).value).toBe(5);
    // Paused loop emits no ticks, so the system does not run.
    loop.pause();
    loop.tick();
    expect(world.getComponent(e, TestCounterComponent).value).toBe(5);
  });

  it("Scenario B: two systems run in a stable order and observe each other", () => {
    const world = newWorld();
    const e = world.createEntity();
    world.addComponent(e, TestCounterComponent, { value: 1 });

    const adder: SimulationSystem = {
      id: systemId("adder"),
      priority: 0,
      update: (ctx) => {
        ctx.world.getComponent(e, TestCounterComponent).value += 1;
      },
    };
    const doubler: SimulationSystem = {
      id: systemId("doubler"),
      priority: 1,
      update: (ctx) => {
        ctx.world.getComponent(e, TestCounterComponent).value *= 10;
      },
    };
    world.registerSystem(doubler);
    world.registerSystem(adder);

    world.update(); // (1 + 1) * 10
    expect(world.getComponent(e, TestCounterComponent).value).toBe(20);
    world.update(); // (20 + 1) * 10
    expect(world.getComponent(e, TestCounterComponent).value).toBe(210);
  });

  it("Scenario C: identical worlds produce identical snapshots", () => {
    const build = (): World => {
      const world = newWorld({ seed: 4242, tickRate: 30 });
      connectWorldToLoop(world, world.services.eventBus);
      // A system that mutates counters using the injected RNG only.
      world.registerSystem({
        id: systemId("rng-mutator"),
        update: (ctx) => {
          for (const { entityId } of ctx.world.query(TestCounterComponent)) {
            ctx.world.getComponent(entityId, TestCounterComponent).value +=
              ctx.services.rng.nextInt(1, 7);
          }
        },
      });
      for (let i = 0; i < 4; i += 1) {
        const id = world.createEntity();
        world.addComponent(id, TestCounterComponent, { value: 0 });
      }
      const loop = new GameLoop(world.services);
      loop.start();
      for (let t = 0; t < 20; t += 1) {
        loop.tick();
      }
      return world;
    };

    expect(build().snapshot()).toEqual(build().snapshot());
  });

  it("Scenario D: cleanup leaves no orphan components or ghosts", () => {
    const world = newWorld();
    const ids = Array.from({ length: 5 }, () => world.createEntity());
    for (const id of ids) {
      world.addComponent(id, TestCounterComponent, { value: Number(id) });
      world.addComponent(id, TestTagComponent, { tag: "x" });
    }
    world.destroyEntity(ids[1]!);
    world.destroyEntity(ids[3]!);

    expect(world.getEntityCount()).toBe(3);
    const counters = world.query(TestCounterComponent).map((r) => r.entityId);
    expect(counters).toEqual([ids[0], ids[2], ids[4]]);
    expect(world.query(TestTagComponent, TestCounterComponent)).toHaveLength(3);
  });

  it("mutating during query iteration is safe (snapshot semantics)", () => {
    const world = newWorld();
    const ids = Array.from({ length: 3 }, () => world.createEntity());
    for (const id of ids) {
      world.addComponent(id, TestCounterComponent, { value: 0 });
    }
    // Destroy every matched entity while iterating the materialised results.
    expect(() => {
      for (const { entityId } of world.query(TestCounterComponent)) {
        world.destroyEntity(entityId);
      }
    }).not.toThrow();
    expect(world.getEntityCount()).toBe(0);
    expect(world.query(TestCounterComponent)).toHaveLength(0);
  });
});

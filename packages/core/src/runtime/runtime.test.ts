import { describe, expect, it, vi } from "vitest";
import { loadRuntimeConfig, fixedDeltaMs } from "./config.js";
import { TickEngine } from "./tick-engine.js";
import { SimulationClock } from "./clock.js";
import { Mulberry32Rng } from "./rng.js";
import { EventBus } from "./event-bus.js";
import { Scheduler, type TaskId } from "./scheduler.js";
import { createRuntimeServices } from "./service-container.js";
import { GameLoop } from "./game-loop.js";
import { createMonotonicIdFactory } from "./ids.js";

describe("Configuration", () => {
  it("applies defaults and derives the fixed delta", () => {
    const config = loadRuntimeConfig({ tickRate: 50 });
    expect(config).toMatchObject({ tickRate: 50, debug: false, seed: 1, simulationSpeed: 1 });
    expect(fixedDeltaMs(config)).toBe(20);
  });

  it("rejects an invalid tick rate", () => {
    expect(() => loadRuntimeConfig({ tickRate: 0 })).toThrow(/Invalid runtime configuration/);
  });
});

describe("TickEngine", () => {
  it("advances and resets deterministically", () => {
    const engine = new TickEngine();
    expect(engine.currentTick).toBe(0);
    expect(engine.advance()).toBe(1);
    engine.advance();
    expect(engine.currentTick).toBe(2);
    engine.reset();
    expect(engine.currentTick).toBe(0);
  });
});

describe("SimulationClock", () => {
  it("accumulates simulation time and exposes seconds", () => {
    const clock = new SimulationClock();
    clock.advance(50, 1);
    clock.advance(50, 2);
    expect(clock.deltaTime).toBe(50);
    expect(clock.simulationTime).toBe(100);
    expect(clock.elapsedTime).toBeCloseTo(0.1, 10);
    expect(clock.currentTick).toBe(2);
  });
});

describe("Mulberry32Rng", () => {
  it("produces an identical sequence for identical seeds", () => {
    const a = new Mulberry32Rng(12345);
    const b = new Mulberry32Rng(12345);
    const seqA = Array.from({ length: 8 }, () => a.nextFloat());
    const seqB = Array.from({ length: 8 }, () => b.nextFloat());
    expect(seqA).toEqual(seqB);
  });

  it("diverges for different seeds", () => {
    const a = new Mulberry32Rng(1);
    const b = new Mulberry32Rng(2);
    expect(a.nextFloat()).not.toBe(b.nextFloat());
  });

  it("bounds nextInt to [min, max) and validates the range", () => {
    const rng = new Mulberry32Rng(7);
    for (let i = 0; i < 100; i += 1) {
      const value = rng.nextInt(3, 6);
      expect(value).toBeGreaterThanOrEqual(3);
      expect(value).toBeLessThan(6);
    }
    expect(() => rng.nextInt(5, 5)).toThrow(RangeError);
  });

  it("shuffle is deterministic and preserves elements", () => {
    const input = [1, 2, 3, 4, 5];
    const a = new Mulberry32Rng(99).shuffle(input);
    const b = new Mulberry32Rng(99).shuffle(input);
    expect(a).toEqual(b);
    expect([...a].sort((x, y) => x - y)).toEqual(input);
    expect(input).toEqual([1, 2, 3, 4, 5]); // input not mutated
  });
});

describe("EventBus", () => {
  it("delivers to subscribers and stops after unsubscribe", () => {
    const bus = new EventBus<{ ping: { n: number } }>();
    const seen: number[] = [];
    const off = bus.subscribe("ping", (p) => seen.push(p.n));
    bus.publish("ping", { n: 1 });
    off();
    bus.publish("ping", { n: 2 });
    expect(seen).toEqual([1]);
  });

  it("once delivers exactly one time", () => {
    const bus = new EventBus<{ ping: number }>();
    const seen: number[] = [];
    bus.once("ping", (n) => seen.push(n));
    bus.publish("ping", 1);
    bus.publish("ping", 2);
    expect(seen).toEqual([1]);
  });

  it("clear removes handlers", () => {
    const bus = new EventBus<{ ping: number }>();
    const handler = vi.fn();
    bus.subscribe("ping", handler);
    bus.clear("ping");
    bus.publish("ping", 1);
    expect(handler).not.toHaveBeenCalled();
  });
});

describe("Scheduler", () => {
  it("runs a one-shot task exactly at its target tick", () => {
    const scheduler = new Scheduler();
    const firedAt: number[] = [];
    scheduler.scheduleAt(3, () => firedAt.push(3));

    for (let tick = 1; tick <= 5; tick += 1) {
      scheduler.runDueTasks(tick);
    }
    expect(firedAt).toEqual([3]);
    expect(scheduler.pendingCount).toBe(0);
  });

  it("repeats a task on its interval and can be cancelled", () => {
    const scheduler = new Scheduler();
    let count = 0;
    const id: TaskId = scheduler.scheduleEvery(2, () => (count += 1), 2);

    for (let tick = 1; tick <= 6; tick += 1) {
      scheduler.runDueTasks(tick);
      if (tick === 4) {
        scheduler.cancel(id);
      }
    }
    // Fires at tick 2 and 4, cancelled before tick 6.
    expect(count).toBe(2);
  });
});

describe("createRuntimeServices", () => {
  it("returns isolated instances and honours overrides", () => {
    const a = createRuntimeServices({ seed: 5 });
    const b = createRuntimeServices({ seed: 5 });
    expect(a.eventBus).not.toBe(b.eventBus);
    expect(a.rng.nextFloat()).toBe(b.rng.nextFloat());

    const scheduler = new Scheduler(createMonotonicIdFactory<TaskId>());
    const c = createRuntimeServices({}, { scheduler });
    expect(c.scheduler).toBe(scheduler);
  });
});

describe("GameLoop", () => {
  it("advances one tick per tick() only while running and not paused", () => {
    const services = createRuntimeServices({ tickRate: 10 });
    const loop = new GameLoop(services);

    expect(loop.tick()).toBe(false); // not started
    loop.start();
    expect(loop.tick()).toBe(true);
    expect(services.tickEngine.currentTick).toBe(1);
  });

  it("does not advance while paused and resumes correctly", () => {
    const services = createRuntimeServices({ tickRate: 10 });
    const loop = new GameLoop(services);
    loop.start();
    loop.tick();
    loop.pause();
    expect(loop.tick()).toBe(false);
    expect(services.tickEngine.currentTick).toBe(1);
    loop.resume();
    loop.tick();
    expect(services.tickEngine.currentTick).toBe(2);
  });

  it("advance() runs whole fixed steps from real elapsed time", () => {
    const services = createRuntimeServices({ tickRate: 10 }); // fixedDelta = 100ms
    const loop = new GameLoop(services);
    loop.start();
    const steps = loop.advance(250);
    expect(steps).toBe(2);
    expect(services.tickEngine.currentTick).toBe(2);
    expect(services.clock.simulationTime).toBe(200);
  });

  it("emits lifecycle events", () => {
    const services = createRuntimeServices({ tickRate: 10 });
    const loop = new GameLoop(services);
    const events: string[] = [];
    services.eventBus.subscribe("SimulationStarted", () => events.push("start"));
    services.eventBus.subscribe("TickAdvanced", () => events.push("tick"));
    services.eventBus.subscribe("SimulationStopped", () => events.push("stop"));
    loop.start();
    loop.tick();
    loop.stop();
    expect(events).toEqual(["start", "tick", "stop"]);
  });
});

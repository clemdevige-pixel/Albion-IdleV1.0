import { describe, it, expect } from "vitest";
import { RuntimeOrchestrator, type PersistenceAdapter } from "./runtime-orchestrator.js";
import { createMemoryLogger } from "./logger.js";
import { systemId } from "../system/system.js";
import type { SimulationSystem } from "../system/system.js";

function createOrchestrator(opts: { persistence?: PersistenceAdapter } = {}) {
  const logger = createMemoryLogger();
  return new RuntimeOrchestrator({
    config: { seed: 42, tickRate: 20 },
    logger,
    persistence: opts.persistence,
  });
}

describe("RuntimeOrchestrator lifecycle", () => {
  it("starts in created state", () => {
    const rt = createOrchestrator();
    expect(rt.getState()).toBe("created");
  });

  it("transitions created → running → paused → running → stopped", () => {
    const rt = createOrchestrator();
    rt.start();
    expect(rt.getState()).toBe("running");
    rt.pause();
    expect(rt.getState()).toBe("paused");
    rt.resume();
    expect(rt.getState()).toBe("running");
    rt.stop();
    expect(rt.getState()).toBe("stopped");
  });

  it("can restart after stopping", () => {
    const rt = createOrchestrator();
    rt.start();
    rt.stop();
    rt.start();
    expect(rt.getState()).toBe("running");
  });

  it("dispose is terminal and idempotent", () => {
    const rt = createOrchestrator();
    rt.start();
    rt.dispose();
    expect(rt.getState()).toBe("disposed");
    rt.dispose();
    expect(rt.getState()).toBe("disposed");
  });

  it("throws on invalid transitions", () => {
    const rt = createOrchestrator();
    expect(() => rt.pause()).toThrow();
    expect(() => rt.resume()).toThrow();
    expect(() => rt.stop()).toThrow();
    rt.start();
    expect(() => rt.start()).toThrow();
    rt.dispose();
    expect(() => rt.start()).toThrow();
    expect(() => rt.reset()).toThrow();
  });
});

describe("step", () => {
  it("only works when paused", () => {
    const rt = createOrchestrator();
    expect(() => rt.step()).toThrow();
    rt.start();
    expect(() => rt.step()).toThrow();
    rt.pause();
    rt.step();
    expect(rt.getCurrentTick()).toBe(1);
  });
});

describe("tick", () => {
  it("advances tick when running", () => {
    const rt = createOrchestrator();
    rt.start();
    rt.tick();
    rt.tick();
    expect(rt.getCurrentTick()).toBe(2);
  });

  it("no-op when not running", () => {
    const rt = createOrchestrator();
    rt.tick();
    expect(rt.getCurrentTick()).toBe(0);
  });
});

describe("error boundary", () => {
  it("system error transitions to failed state", () => {
    const rt = createOrchestrator();
    const crashSystem: SimulationSystem = {
      id: systemId("crash"),
      priority: 0,
      update() {
        throw new Error("system crash");
      },
    };
    rt.world.registerSystem(crashSystem);
    rt.start();
    rt.tick();
    expect(rt.getState()).toBe("failed");
    const health = rt.getHealth();
    expect(health.status).toBe("failed");
    if (health.status === "failed") {
      expect(health.error.message).toBe("system crash");
    }
  });

  it("no more ticks after failure", () => {
    const rt = createOrchestrator();
    let calls = 0;
    rt.world.registerSystem({
      id: systemId("counter"),
      update() {
        calls++;
        if (calls === 1) throw new Error("fail");
      },
    });
    rt.start();
    rt.tick();
    expect(rt.getState()).toBe("failed");
    rt.tick();
    expect(calls).toBe(1);
  });

  it("records diagnostic on failure", () => {
    const rt = createOrchestrator();
    rt.world.registerSystem({
      id: systemId("boom"),
      update() {
        throw new Error("boom");
      },
    });
    rt.start();
    rt.tick();
    const diags = rt.getDiagnostics();
    expect(diags.length).toBeGreaterThan(0);
    expect(diags[0]?.severity).toBe("fatal");
  });
});

describe("reset", () => {
  it("returns to created state", () => {
    const rt = createOrchestrator();
    rt.start();
    rt.tick();
    rt.tick();
    rt.stop();
    rt.reset();
    expect(rt.getState()).toBe("created");
    expect(rt.getCurrentTick()).toBe(0);
  });

  it("produces deterministic state from same seed", () => {
    const rt = createOrchestrator();
    rt.start();
    for (let i = 0; i < 5; i++) rt.tick();
    const tick1 = rt.getCurrentTick();
    const rng1 = rt.services.rng.nextFloat();
    rt.reset();
    rt.start();
    for (let i = 0; i < 5; i++) rt.tick();
    expect(rt.getCurrentTick()).toBe(tick1);
    expect(rt.services.rng.nextFloat()).toBe(rng1);
  });

  it("can reset from failed state", () => {
    const rt = createOrchestrator();
    rt.world.registerSystem({
      id: systemId("crash"),
      update() {
        throw new Error("crash");
      },
    });
    rt.start();
    rt.tick();
    expect(rt.getState()).toBe("failed");
    rt.reset();
    expect(rt.getState()).toBe("created");
  });
});

describe("metrics and health", () => {
  it("reports healthy when no issues", () => {
    const rt = createOrchestrator();
    expect(rt.getHealth().status).toBe("healthy");
  });

  it("metrics track ticks", () => {
    const rt = createOrchestrator();
    rt.start();
    rt.tick();
    rt.tick();
    const m = rt.getMetrics();
    expect(m.ticksExecuted).toBeGreaterThanOrEqual(2);
  });

  it("metrics track entity count", () => {
    const rt = createOrchestrator();
    rt.world.createEntity();
    rt.world.createEntity();
    const m = rt.getMetrics();
    expect(m.entityCount).toBe(2);
  });
});

describe("persistence", () => {
  it("throws when no adapter configured", () => {
    const rt = createOrchestrator();
    expect(() => rt.save("s1")).toThrow("No persistence adapter");
    expect(() => rt.load("s1")).toThrow("No persistence adapter");
  });

  it("save/load delegates to adapter", () => {
    let savedTick = -1;
    let loadedId = "";
    const adapter: PersistenceAdapter = {
      save(_id, tick) {
        savedTick = tick;
      },
      load(id) {
        loadedId = id;
      },
    };
    const rt = createOrchestrator({ persistence: adapter });
    rt.start();
    rt.tick();
    rt.save("s1");
    expect(savedTick).toBe(1);
    rt.load("s1");
    expect(loadedId).toBe("s1");
  });

  it("failed load does not corrupt state", () => {
    const adapter: PersistenceAdapter = {
      save() {},
      load() {
        throw new Error("corrupt save");
      },
    };
    const rt = createOrchestrator({ persistence: adapter });
    rt.start();
    rt.tick();
    rt.tick();
    const tickBefore = rt.getCurrentTick();
    expect(() => rt.load("bad")).toThrow("corrupt save");
    expect(rt.getCurrentTick()).toBe(tickBefore);
    expect(rt.getState()).toBe("running");
  });
});

describe("two identical runtimes", () => {
  it("same config and seed produce identical state", () => {
    const rt1 = createOrchestrator();
    const rt2 = createOrchestrator();
    rt1.start();
    rt2.start();
    for (let i = 0; i < 10; i++) {
      rt1.tick();
      rt2.tick();
    }
    expect(rt1.getCurrentTick()).toBe(rt2.getCurrentTick());
    expect(rt1.services.rng.nextFloat()).toBe(rt2.services.rng.nextFloat());
  });
});

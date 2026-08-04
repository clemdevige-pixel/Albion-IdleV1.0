import { describe, it, expect, beforeEach } from "vitest";
import { RefiningSession } from "../refining/refining-session.js";
import { asRefiningSessionId } from "../refining/refining-types.js";
import {
  RefiningManager,
  _resetRefiningSessionCounter,
} from "../refining/refining-manager.js";
import type {
  RefiningSessionConfig,
  RefiningRequest,
} from "../refining/refining-types.js";
import { asRecipeId } from "../recipes/recipe-types.js";
import { asCraftStationId } from "../craft-stations/craft-station-types.js";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeConfig(
  overrides?: Partial<RefiningSessionConfig>,
): RefiningSessionConfig {
  return {
    baseRefineTicks: 10,
    speedModifier: 1,
    ...overrides,
  };
}

function makeRequest(overrides?: Partial<RefiningRequest>): RefiningRequest {
  return {
    recipeId: asRecipeId("refine-steel-t4"),
    stationId: asCraftStationId("station-smelter-t4"),
    quantity: 1,
    ...overrides,
  };
}

function makeSession(
  config?: Partial<RefiningSessionConfig>,
  startTick = 0,
) {
  return new RefiningSession(
    asRefiningSessionId("rs-1"),
    "refine-steel-t4",
    1,
    makeConfig(config),
    startTick,
  );
}

// ---------------------------------------------------------------------------
// RefiningSession
// ---------------------------------------------------------------------------

describe("RefiningSession", () => {
  it("starts in idle state", () => {
    const session = makeSession();
    expect(session.state).toBe("idle");
  });

  it("transitions idle → refining", () => {
    const session = makeSession();
    session.start();
    expect(session.state).toBe("refining");
  });

  it("transitions refining → completed on tick when time elapsed", () => {
    const session = makeSession({ baseRefineTicks: 5 });
    session.start();
    session.tick(5);
    expect(session.state).toBe("completed");
  });

  it("stays in refining if not enough ticks", () => {
    const session = makeSession({ baseRefineTicks: 10 });
    session.start();
    session.tick(5);
    expect(session.state).toBe("refining");
  });

  it("reports progress correctly", () => {
    const session = makeSession({ baseRefineTicks: 10 });
    expect(session.getProgress(0)).toBe(0); // idle
    session.start();
    expect(session.getProgress(5)).toBe(0.5);
    session.tick(10);
    expect(session.getProgress(10)).toBe(1);
  });

  it("can be cancelled from refining", () => {
    const session = makeSession();
    session.start();
    session.cancel();
    expect(session.state).toBe("cancelled");
  });

  it("can be cancelled from idle", () => {
    const session = makeSession();
    session.cancel();
    expect(session.state).toBe("cancelled");
  });

  it("cannot cancel after completed", () => {
    const session = makeSession({ baseRefineTicks: 1 });
    session.start();
    session.tick(1);
    session.cancel();
    expect(session.state).toBe("completed");
  });

  it("can fail from refining", () => {
    const session = makeSession();
    session.start();
    session.fail();
    expect(session.state).toBe("failed");
  });

  it("cannot fail after completed", () => {
    const session = makeSession({ baseRefineTicks: 1 });
    session.start();
    session.tick(1);
    session.fail();
    expect(session.state).toBe("completed");
  });

  it("applies speedModifier to required ticks", () => {
    const session = makeSession({ baseRefineTicks: 10, speedModifier: 2 });
    expect(session.getRequiredTicks()).toBe(20);
  });
});

// ---------------------------------------------------------------------------
// RefiningManager
// ---------------------------------------------------------------------------

describe("RefiningManager", () => {
  let manager: RefiningManager;

  beforeEach(() => {
    _resetRefiningSessionCounter();
    manager = new RefiningManager();
  });

  it("starts a refining session", () => {
    const result = manager.startRefining(makeRequest(), makeConfig(), 0);
    expect(result.ok).toBe(true);
    expect(manager.getActiveSession()).toBeDefined();
  });

  it("rejects a second session while one is active", () => {
    manager.startRefining(makeRequest(), makeConfig(), 0);
    const result = manager.startRefining(makeRequest(), makeConfig(), 0);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toBe("session_already_active");
  });

  it("rejects invalid quantity", () => {
    const result = manager.startRefining(
      makeRequest({ quantity: 0 }),
      makeConfig(),
      0,
    );
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toBe("invalid_quantity");
  });

  it("completes session after enough ticks", () => {
    manager.startRefining(makeRequest(), makeConfig({ baseRefineTicks: 3 }), 0);
    manager.tick(1);
    manager.tick(2);
    manager.tick(3);
    // After completion, getActiveSession returns undefined
    expect(manager.getActiveSession()).toBeUndefined();
  });

  it("allows new session after previous completed", () => {
    manager.startRefining(makeRequest(), makeConfig({ baseRefineTicks: 1 }), 0);
    manager.tick(1);
    const result = manager.startRefining(makeRequest(), makeConfig(), 2);
    expect(result.ok).toBe(true);
  });

  it("cancels an active session", () => {
    const start = manager.startRefining(makeRequest(), makeConfig(), 0);
    if (!start.ok) throw new Error("should start");
    const cancelled = manager.cancelSession(start.sessionId);
    expect(cancelled).toBe(true);
    expect(manager.getActiveSession()).toBeUndefined();
  });

  it("emits refine:started event", () => {
    const events: unknown[] = [];
    manager.events.subscribe("refine:started", (e) => events.push(e));
    manager.startRefining(makeRequest(), makeConfig(), 0);
    expect(events).toHaveLength(1);
  });

  it("emits refine:completed event", () => {
    const events: unknown[] = [];
    manager.events.subscribe("refine:completed", (e) => events.push(e));
    manager.startRefining(makeRequest(), makeConfig({ baseRefineTicks: 1 }), 0);
    manager.tick(1);
    expect(events).toHaveLength(1);
  });

  it("emits refine:cancelled event", () => {
    const events: unknown[] = [];
    manager.events.subscribe("refine:cancelled", (e) => events.push(e));
    const start = manager.startRefining(makeRequest(), makeConfig(), 0);
    if (start.ok) manager.cancelSession(start.sessionId);
    expect(events).toHaveLength(1);
  });

  it("clear resets state", () => {
    manager.startRefining(makeRequest(), makeConfig(), 0);
    manager.clear();
    expect(manager.getActiveSession()).toBeUndefined();
  });
});

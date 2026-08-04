import { describe, it, expect, beforeEach } from "vitest";
import { CraftingSession } from "../crafting/crafting-session.js";
import { asCraftingSessionId } from "../crafting/crafting-types.js";
import { resolveCraftResult } from "../crafting/crafting-resolver.js";
import {
  CraftingManager,
  _resetCraftingSessionCounter,
} from "../crafting/crafting-manager.js";
import type {
  CraftingSessionConfig,
  CraftingRequest,
} from "../crafting/crafting-types.js";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeConfig(
  overrides?: Partial<CraftingSessionConfig>,
): CraftingSessionConfig {
  return {
    baseCraftTimeTicks: 10,
    speedModifier: 1,
    yieldModifier: 1,
    qualityModifier: 1,
    ...overrides,
  };
}

function makeRequest(overrides?: Partial<CraftingRequest>): CraftingRequest {
  return {
    recipeId: "recipe-sword-t4",
    quantity: 1,
    ...overrides,
  };
}

function makeSession(
  config?: Partial<CraftingSessionConfig>,
  startTick = 0,
) {
  return new CraftingSession(
    asCraftingSessionId("cs-1"),
    "recipe-sword-t4",
    1,
    makeConfig(config),
    startTick,
  );
}

// ---------------------------------------------------------------------------
// CraftingSession
// ---------------------------------------------------------------------------

describe("CraftingSession", () => {
  it("starts in idle state", () => {
    const session = makeSession();
    expect(session.state).toBe("idle");
  });

  it("transitions idle → validating → crafting", () => {
    const session = makeSession();
    session.validate();
    expect(session.state).toBe("validating");
    session.start();
    expect(session.state).toBe("crafting");
  });

  it("transitions crafting → completing on tick when time elapsed", () => {
    const session = makeSession({ baseCraftTimeTicks: 5 });
    session.validate();
    session.start();
    session.tick(5);
    expect(session.state).toBe("completing");
  });

  it("stays in crafting if not enough ticks", () => {
    const session = makeSession({ baseCraftTimeTicks: 10 });
    session.validate();
    session.start();
    session.tick(5);
    expect(session.state).toBe("crafting");
  });

  it("transitions completing → completed", () => {
    const session = makeSession({ baseCraftTimeTicks: 5 });
    session.validate();
    session.start();
    session.tick(5);
    session.complete();
    expect(session.state).toBe("completed");
  });

  it("can be cancelled from crafting", () => {
    const session = makeSession();
    session.validate();
    session.start();
    session.cancel();
    expect(session.state).toBe("cancelled");
  });

  it("can be cancelled from validating", () => {
    const session = makeSession();
    session.validate();
    session.cancel();
    expect(session.state).toBe("cancelled");
  });

  it("cannot be cancelled once completed", () => {
    const session = makeSession({ baseCraftTimeTicks: 1 });
    session.validate();
    session.start();
    session.tick(1);
    session.complete();
    session.cancel();
    expect(session.state).toBe("completed");
  });

  it("can fail from crafting", () => {
    const session = makeSession();
    session.validate();
    session.start();
    session.fail("out_of_materials");
    expect(session.state).toBe("failed");
  });

  it("cannot fail once completed", () => {
    const session = makeSession({ baseCraftTimeTicks: 1 });
    session.validate();
    session.start();
    session.tick(1);
    session.complete();
    session.fail();
    expect(session.state).toBe("completed");
  });

  it("reports progress correctly", () => {
    const session = makeSession({ baseCraftTimeTicks: 10 });
    expect(session.getProgress(0)).toBe(0); // idle
    session.validate();
    session.start();
    expect(session.getProgress(5)).toBe(0.5);
    expect(session.getProgress(10)).toBe(1);
  });

  it("getRequiredTicks accounts for speed modifier", () => {
    const session = makeSession({
      baseCraftTimeTicks: 10,
      speedModifier: 0.5,
    });
    expect(session.getRequiredTicks()).toBe(5);
  });
});

// ---------------------------------------------------------------------------
// CraftingResolver
// ---------------------------------------------------------------------------

describe("resolveCraftResult", () => {
  it("returns deterministic success result", () => {
    const config = makeConfig();
    const request = makeRequest({ quantity: 3 });
    const result = resolveCraftResult(config, request);
    expect(result).toEqual({
      ok: true,
      recipeId: "recipe-sword-t4",
      outputQuantity: 3,
    });
  });

  it("applies yield modifier", () => {
    const config = makeConfig({ yieldModifier: 2 });
    const request = makeRequest({ quantity: 3 });
    const result = resolveCraftResult(config, request);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.outputQuantity).toBe(6);
    }
  });

  it("returns at least 1 output", () => {
    const config = makeConfig({ yieldModifier: 0.01 });
    const request = makeRequest({ quantity: 1 });
    const result = resolveCraftResult(config, request);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.outputQuantity).toBe(1);
    }
  });
});

// ---------------------------------------------------------------------------
// CraftingManager
// ---------------------------------------------------------------------------

describe("CraftingManager", () => {
  let manager: CraftingManager;

  beforeEach(() => {
    _resetCraftingSessionCounter();
    manager = new CraftingManager();
  });

  it("starts a crafting session", () => {
    const result = manager.startCrafting(makeRequest(), makeConfig(), 0);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.sessionId).toBe("craft-1");
    }
  });

  it("rejects a second concurrent session", () => {
    manager.startCrafting(makeRequest(), makeConfig(), 0);
    const result = manager.startCrafting(makeRequest(), makeConfig(), 0);
    expect(result).toEqual({ ok: false, reason: "session_already_active" });
  });

  it("rejects invalid quantity", () => {
    const result = manager.startCrafting(
      makeRequest({ quantity: 0 }),
      makeConfig(),
      0,
    );
    expect(result).toEqual({ ok: false, reason: "invalid_quantity" });
  });

  it("advances session on tick and completes", () => {
    const config = makeConfig({ baseCraftTimeTicks: 3 });
    manager.startCrafting(makeRequest(), config, 0);

    manager.tick(1);
    expect(manager.getActiveSession()).toBeDefined();

    manager.tick(2);
    expect(manager.getActiveSession()).toBeDefined();

    manager.tick(3);
    expect(manager.getActiveSession()).toBeUndefined();
    expect(manager.getLastResult()).toBeDefined();
    expect(manager.getLastResult()!.ok).toBe(true);
  });

  it("cancels an active session", () => {
    const result = manager.startCrafting(makeRequest(), makeConfig(), 0);
    if (!result.ok) throw new Error("Expected ok");

    const cancelled = manager.cancelSession(result.sessionId);
    expect(cancelled).toBe(true);
    expect(manager.getActiveSession()).toBeUndefined();
  });

  it("returns false when cancelling nonexistent session", () => {
    const cancelled = manager.cancelSession(asCraftingSessionId("nope"));
    expect(cancelled).toBe(false);
  });

  it("allows new session after previous completed", () => {
    const config = makeConfig({ baseCraftTimeTicks: 1 });
    manager.startCrafting(makeRequest(), config, 0);
    manager.tick(1);

    const result = manager.startCrafting(makeRequest(), config, 2);
    expect(result.ok).toBe(true);
  });

  it("allows new session after previous cancelled", () => {
    const first = manager.startCrafting(makeRequest(), makeConfig(), 0);
    if (first.ok) manager.cancelSession(first.sessionId);

    const result = manager.startCrafting(makeRequest(), makeConfig(), 1);
    expect(result.ok).toBe(true);
  });

  // -----------------------------------------------------------------------
  // Events
  // -----------------------------------------------------------------------

  it("publishes craft:started event", () => {
    const events: unknown[] = [];
    manager.events.subscribe("craft:started", (e) => events.push(e));

    manager.startCrafting(makeRequest(), makeConfig(), 0);
    expect(events).toHaveLength(1);
  });

  it("publishes craft:tick events", () => {
    const ticks: unknown[] = [];
    manager.events.subscribe("craft:tick", (e) => ticks.push(e));

    manager.startCrafting(makeRequest(), makeConfig({ baseCraftTimeTicks: 5 }), 0);
    manager.tick(1);
    manager.tick(2);
    expect(ticks).toHaveLength(2);
  });

  it("publishes craft:completed event", () => {
    const events: unknown[] = [];
    manager.events.subscribe("craft:completed", (e) => events.push(e));

    manager.startCrafting(
      makeRequest(),
      makeConfig({ baseCraftTimeTicks: 1 }),
      0,
    );
    manager.tick(1);
    expect(events).toHaveLength(1);
  });

  it("publishes craft:cancelled event", () => {
    const events: unknown[] = [];
    manager.events.subscribe("craft:cancelled", (e) => events.push(e));

    const result = manager.startCrafting(makeRequest(), makeConfig(), 0);
    if (result.ok) manager.cancelSession(result.sessionId);
    expect(events).toHaveLength(1);
  });
});

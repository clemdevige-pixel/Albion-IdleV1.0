import { describe, it, expect } from "vitest";
import { GatheringSession } from "../gathering-session.js";
import { asGatheringSessionId } from "../gathering-types.js";
import { asResourceId } from "../../resources/resource-types.js";
import { asResourceNodeId } from "../../resource-nodes/resource-node-types.js";
import type { GatheringSessionConfig } from "../gathering-types.js";

function makeSession(config?: Partial<GatheringSessionConfig>, startTick = 0) {
  const fullConfig: GatheringSessionConfig = {
    baseGatherTimeTicks: 10,
    toolModifier: 1,
    masteryModifier: 1,
    ...config,
  };
  return new GatheringSession(
    asGatheringSessionId("gs-1"),
    asResourceNodeId("rn-1"),
    asResourceId("r-1"),
    fullConfig,
    startTick,
  );
}

describe("GatheringSession", () => {
  it("starts in gathering state", () => {
    const session = makeSession();
    expect(session.state).toBe("gathering");
  });

  it("exposes constructor properties", () => {
    const session = makeSession();
    expect(session.id).toBe("gs-1");
    expect(session.nodeId).toBe("rn-1");
    expect(session.resourceId).toBe("r-1");
    expect(session.startTick).toBe(0);
  });

  describe("getRequiredTicks", () => {
    it("returns base ticks when modifiers are 1", () => {
      const session = makeSession({ baseGatherTimeTicks: 10 });
      expect(session.getRequiredTicks()).toBe(10);
    });

    it("applies tool and mastery modifiers", () => {
      const session = makeSession({
        baseGatherTimeTicks: 10,
        toolModifier: 0.5,
        masteryModifier: 0.8,
      });
      // 10 * 0.5 * 0.8 = 4
      expect(session.getRequiredTicks()).toBe(4);
    });

    it("rounds up with Math.ceil", () => {
      const session = makeSession({
        baseGatherTimeTicks: 10,
        toolModifier: 0.33,
        masteryModifier: 1,
      });
      // 10 * 0.33 = 3.3 → ceil = 4
      expect(session.getRequiredTicks()).toBe(4);
    });
  });

  describe("isComplete", () => {
    it("returns false before required ticks elapsed", () => {
      const session = makeSession({ baseGatherTimeTicks: 5 }, 0);
      expect(session.isComplete(4)).toBe(false);
    });

    it("returns true when required ticks elapsed", () => {
      const session = makeSession({ baseGatherTimeTicks: 5 }, 0);
      expect(session.isComplete(5)).toBe(true);
    });

    it("returns true after required ticks elapsed", () => {
      const session = makeSession({ baseGatherTimeTicks: 5 }, 0);
      expect(session.isComplete(10)).toBe(true);
    });
  });

  describe("tick", () => {
    it("transitions to completed when time elapsed", () => {
      const session = makeSession({ baseGatherTimeTicks: 3 }, 0);
      session.tick(3);
      expect(session.state).toBe("completed");
    });

    it("stays gathering when time not elapsed", () => {
      const session = makeSession({ baseGatherTimeTicks: 5 }, 0);
      session.tick(2);
      expect(session.state).toBe("gathering");
    });

    it("does nothing if already interrupted", () => {
      const session = makeSession({ baseGatherTimeTicks: 3 }, 0);
      session.interrupt();
      session.tick(10);
      expect(session.state).toBe("interrupted");
    });
  });

  describe("interrupt", () => {
    it("sets state to interrupted", () => {
      const session = makeSession();
      session.interrupt();
      expect(session.state).toBe("interrupted");
    });

    it("does nothing if not gathering", () => {
      const session = makeSession({ baseGatherTimeTicks: 1 }, 0);
      session.tick(1); // completes
      session.interrupt();
      expect(session.state).toBe("completed");
    });
  });

  describe("complete", () => {
    it("sets state to completed", () => {
      const session = makeSession();
      session.complete();
      expect(session.state).toBe("completed");
    });
  });
});

import { describe, it, expect } from "vitest";
import { MetricsCollector } from "./metrics.js";

describe("MetricsCollector", () => {
  it("starts at zero", () => {
    const mc = new MetricsCollector();
    const m = mc.get();
    expect(m.ticksExecuted).toBe(0);
    expect(m.errorCount).toBe(0);
  });

  it("record sets a value", () => {
    const mc = new MetricsCollector();
    mc.record("entityCount", 42);
    expect(mc.get().entityCount).toBe(42);
  });

  it("increment adds one", () => {
    const mc = new MetricsCollector();
    mc.increment("saveCount");
    mc.increment("saveCount");
    expect(mc.get().saveCount).toBe(2);
  });

  it("get returns a copy (no mutation)", () => {
    const mc = new MetricsCollector();
    const a = mc.get();
    mc.increment("errorCount");
    const b = mc.get();
    expect(a.errorCount).toBe(0);
    expect(b.errorCount).toBe(1);
  });

  it("reset zeros everything", () => {
    const mc = new MetricsCollector();
    mc.increment("ticksExecuted");
    mc.record("entityCount", 10);
    mc.reset();
    const m = mc.get();
    expect(m.ticksExecuted).toBe(0);
    expect(m.entityCount).toBe(0);
  });
});

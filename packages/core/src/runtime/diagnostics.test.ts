import { describe, it, expect } from "vitest";
import { DiagnosticsCollector } from "./diagnostics.js";

describe("DiagnosticsCollector", () => {
  it("starts empty", () => {
    const dc = new DiagnosticsCollector();
    expect(dc.getAll()).toHaveLength(0);
    expect(dc.hasFatal()).toBe(false);
  });

  it("adds diagnostics and preserves order", () => {
    const dc = new DiagnosticsCollector();
    dc.add({ severity: "warning", code: "A", message: "first" });
    dc.add({ severity: "error", code: "B", message: "second" });
    expect(dc.getAll()).toHaveLength(2);
    expect(dc.getAll()[0]?.code).toBe("A");
    expect(dc.getAll()[1]?.code).toBe("B");
  });

  it("hasFatal returns true only when a fatal exists", () => {
    const dc = new DiagnosticsCollector();
    dc.add({ severity: "warning", code: "W", message: "warn" });
    expect(dc.hasFatal()).toBe(false);
    dc.add({ severity: "fatal", code: "F", message: "fatal" });
    expect(dc.hasFatal()).toBe(true);
  });

  it("clear removes all diagnostics", () => {
    const dc = new DiagnosticsCollector();
    dc.add({ severity: "fatal", code: "F", message: "fatal" });
    dc.clear();
    expect(dc.getAll()).toHaveLength(0);
    expect(dc.hasFatal()).toBe(false);
  });
});

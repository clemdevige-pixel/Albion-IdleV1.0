import { describe, it, expect } from "vitest";
import type { RuntimeHealth } from "./health.js";

describe("RuntimeHealth types", () => {
  it("healthy state", () => {
    const h: RuntimeHealth = { status: "healthy" };
    expect(h.status).toBe("healthy");
  });

  it("degraded state with issues", () => {
    const h: RuntimeHealth = {
      status: "degraded",
      issues: [{ severity: "warning", code: "W1", message: "low" }],
    };
    expect(h.status).toBe("degraded");
    if (h.status === "degraded") {
      expect(h.issues).toHaveLength(1);
    }
  });

  it("failed state with error", () => {
    const h: RuntimeHealth = {
      status: "failed",
      error: { message: "boom", tick: 10 },
    };
    expect(h.status).toBe("failed");
    if (h.status === "failed") {
      expect(h.error.tick).toBe(10);
    }
  });
});

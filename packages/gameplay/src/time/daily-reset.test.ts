import { describe, expect, it } from "vitest";
import { DAILY_RESET_RULES } from "@game/data";
import { getDailyRotationId, getNextDailyResetAt } from "./daily-reset.js";

describe("daily reset", () => {
  it("keeps the authored reset hour inside the UTC day", () => {
    expect(DAILY_RESET_RULES.resetHourUtc).toBeGreaterThanOrEqual(0);
    expect(DAILY_RESET_RULES.resetHourUtc).toBeLessThan(24);
  });

  it("rotates exactly at the shared UTC reset boundary", () => {
    const beforeReset = Date.UTC(2026, 7, 26, 23, 59, 59, 999);
    const atReset = Date.UTC(2026, 7, 27, 0, 0, 0, 0);

    expect(getDailyRotationId(beforeReset)).toBe("2026-08-26");
    expect(getDailyRotationId(atReset)).toBe("2026-08-27");
  });

  it("resolves the next shared reset timestamp", () => {
    const now = Date.UTC(2026, 7, 26, 12, 0, 0, 0);
    expect(getNextDailyResetAt(now)).toBe(Date.UTC(2026, 7, 27, 0, 0, 0, 0));
  });
});

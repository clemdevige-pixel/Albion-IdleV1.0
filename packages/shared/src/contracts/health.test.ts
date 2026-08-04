import { describe, expect, it } from "vitest";
import { HealthStatusSchema } from "./health.js";

describe("HealthStatusSchema", () => {
  it("accepts a well-formed health payload", () => {
    const payload = {
      status: "ok",
      apiVersion: "1",
      timestamp: new Date().toISOString(),
      uptimeSeconds: 12,
    };
    const parsed = HealthStatusSchema.parse(payload);
    expect(parsed.status).toBe("ok");
  });

  it("rejects a negative uptime", () => {
    const result = HealthStatusSchema.safeParse({
      status: "ok",
      apiVersion: "1",
      timestamp: new Date().toISOString(),
      uptimeSeconds: -1,
    });
    expect(result.success).toBe(false);
  });

  it("rejects a non-ISO timestamp", () => {
    const result = HealthStatusSchema.safeParse({
      status: "ok",
      apiVersion: "1",
      timestamp: "not-a-date",
      uptimeSeconds: 0,
    });
    expect(result.success).toBe(false);
  });
});

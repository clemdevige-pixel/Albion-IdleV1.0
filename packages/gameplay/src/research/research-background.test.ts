import { describe, expect, it, vi } from "vitest";
import { ResearchService } from "./research-service.js";

describe("ResearchService background progression", () => {
  it("uses the normal advance path and emits one completion event", () => {
    const service = new ResearchService({
      requirementPort: { isRequirementMet: () => true },
      paymentPort: { tryConsumeResearchCost: () => true },
    });
    service.registerResearch({
      id: "research_test",
      displayName: "Test",
      tier: 4,
      durationMs: 1_000,
      cost: { silver: 0, materials: [] },
      requirements: [],
      unlockIds: ["unlock_test"],
    });
    expect(service.startResearch("research_test").ok).toBe(true);

    const onCompleted = vi.fn();
    service.onCompleted(onCompleted);
    service.resolveBackground(1_000);

    expect(service.hasCompleted("research_test")).toBe(true);
    expect(service.getActiveResearch()).toBeUndefined();
    expect(onCompleted).toHaveBeenCalledTimes(1);
    expect(onCompleted).toHaveBeenCalledWith("research_test");
  });
});

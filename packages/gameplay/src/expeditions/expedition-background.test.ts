import { describe, expect, it, vi } from "vitest";
import { ExpeditionService } from "./expedition-service.js";
import { EXPEDITION_DURATION_OPTIONS_MS } from "./types.js";

describe("ExpeditionService background progression", () => {
  it("uses the normal advance path, grants rewards, and emits one grouped completion event", () => {
    const rewardPort = { grantCompletionReward: vi.fn(() => ({ silver: 30_000 })) };
    const service = new ExpeditionService({
      requirementPort: { isRequirementMet: () => true },
      slotCapacityPort: { getSlotCapacity: () => 1 },
      rewardPort,
    });
    service.registerExpedition({
      id: "expedition_test",
      typeId: "test",
      displayName: "Test",
      tier: 4,
      requirements: [],
    });
    const durationMs = EXPEDITION_DURATION_OPTIONS_MS[0];
    expect(service.startExpedition("expedition_test", durationMs).ok).toBe(true);

    const onCompleted = vi.fn();
    service.onCompleted(onCompleted);
    service.resolveBackground(durationMs);

    expect(rewardPort.grantCompletionReward).toHaveBeenCalledTimes(1);
    expect(service.getActiveExpeditions()).toEqual([]);
    expect(service.getCompletedCount("test")).toBe(1);
    expect(onCompleted).toHaveBeenCalledTimes(1);
    expect(onCompleted.mock.calls[0]?.[0]).toHaveLength(1);
  });
});

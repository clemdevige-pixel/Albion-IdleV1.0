import { describe, expect, it } from "vitest";
import { ExpeditionService } from "./expedition-service.js";
import {
  EXPEDITION_DURATION_OPTIONS_MS,
  ExpeditionRewardDeferredError,
  type ExpeditionDefinition,
  type ExpeditionRequirementDefinition,
} from "./types.js";

const [DURATION_2H] = EXPEDITION_DURATION_OPTIONS_MS;

type TestRequirement = ExpeditionRequirementDefinition;

const definition: ExpeditionDefinition<TestRequirement> = {
  id: "expedition_test_t4",
  typeId: "generalist",
  displayName: "Test Expedition",
  tier: 4,
  requirements: [],
};

describe("Expedition deferred rewards", () => {
  it("keeps a completed expedition pending when its reward cannot be credited", () => {
    let inventoryHasSpace = false;
    let rewardCredits = 0;
    const service = new ExpeditionService<TestRequirement, { credited: true }>({
      requirementPort: { isRequirementMet: () => true },
      slotCapacityPort: { getSlotCapacity: () => 1 },
      rewardPort: {
        grantCompletionReward: () => {
          if (!inventoryHasSpace) {
            throw new ExpeditionRewardDeferredError("inventory full");
          }
          rewardCredits += 1;
          return { credited: true };
        },
      },
    });

    expect(service.registerExpedition(definition)).toEqual({ ok: true });
    expect(service.startExpedition(definition.id, DURATION_2H).ok).toBe(true);

    const blocked = service.advance(DURATION_2H);
    expect(blocked.completed).toEqual([]);
    expect(blocked.activeExpeditions).toHaveLength(1);
    expect(blocked.activeExpeditions[0]?.remainingDurationMs).toBe(1);
    expect(service.getCompletedCount(definition.typeId)).toBe(0);
    expect(rewardCredits).toBe(0);

    inventoryHasSpace = true;
    const completed = service.advance(1);
    expect(completed.completed).toHaveLength(1);
    expect(completed.activeExpeditions).toEqual([]);
    expect(service.getCompletedCount(definition.typeId)).toBe(1);
    expect(rewardCredits).toBe(1);
  });

  it("still propagates genuine reward implementation errors", () => {
    const service = new ExpeditionService<TestRequirement, never>({
      requirementPort: { isRequirementMet: () => true },
      slotCapacityPort: { getSlotCapacity: () => 1 },
      rewardPort: {
        grantCompletionReward: () => {
          throw new Error("broken reward table");
        },
      },
    });
    service.registerExpedition(definition);
    service.startExpedition(definition.id, DURATION_2H);

    expect(() => service.advance(DURATION_2H)).toThrow("broken reward table");
  });
});

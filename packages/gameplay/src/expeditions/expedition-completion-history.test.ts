import { describe, expect, it } from "vitest";
import { ExpeditionService } from "./expedition-service.js";
import {
  EXPEDITION_DURATION_OPTIONS_MS,
  type ExpeditionDefinition,
  type ExpeditionRequirementDefinition,
} from "./types.js";

type Requirement = ExpeditionRequirementDefinition & { readonly type: "none" };

function createService() {
  return new ExpeditionService<Requirement, { readonly ok: true }>({
    requirementPort: { isRequirementMet: () => true },
    slotCapacityPort: { getSlotCapacity: () => 2 },
    rewardPort: { grantCompletionReward: () => ({ ok: true }) },
  });
}

function definition(id: string, typeId: string): ExpeditionDefinition<Requirement> {
  return {
    id,
    typeId,
    displayName: id,
    tier: 4,
    requirements: [],
  };
}

const DURATION_2H = EXPEDITION_DURATION_OPTIONS_MS[0];

describe("ExpeditionService lifetime completion history", () => {
  it("tracks total and per-type completions only after rewards are granted", () => {
    const service = createService();
    service.registerExpedition(definition("silver_t4", "silver"));
    service.registerExpedition(definition("keeper_t4", "keeper"));

    service.startExpedition("silver_t4", DURATION_2H);
    service.startExpedition("keeper_t4", DURATION_2H);
    expect(service.getTotalCompletedCount()).toBe(0);

    service.advance(DURATION_2H);

    expect(service.getCompletedCount("silver")).toBe(1);
    expect(service.getCompletedCount("keeper")).toBe(1);
    expect(service.getTotalCompletedCount()).toBe(2);
  });

  it("persists completion history and loads legacy v1 snapshots with zero history", () => {
    const source = createService();
    source.registerExpedition(definition("silver_t4", "silver"));
    source.startExpedition("silver_t4", DURATION_2H);
    source.advance(DURATION_2H);

    const restored = createService();
    restored.registerExpedition(definition("silver_t4", "silver"));
    restored.load(source.save());
    expect(restored.getCompletedCount("silver")).toBe(1);
    expect(restored.getTotalCompletedCount()).toBe(1);

    restored.load({ version: 1, activeExpeditions: [] });
    expect(restored.getCompletedCount("silver")).toBe(0);
    expect(restored.getTotalCompletedCount()).toBe(0);
  });
});

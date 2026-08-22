import { describe, expect, it } from "vitest";
import {
  EXPEDITION_DURATION_OPTIONS_MS,
  ExpeditionService,
  ResearchService,
  type ExpeditionRequirementDefinition,
  type ResearchRequirementDefinition,
} from "@game/gameplay";
import { createAcademyPresentationFoundation } from "./createAcademyPresentationFoundation.js";

type Requirement = ResearchRequirementDefinition & { readonly type: "flag" };
type ExpeditionRequirement = ExpeditionRequirementDefinition & { readonly type: "flag" };

function createFoundation() {
  const researchService = new ResearchService<Requirement>({
    requirementPort: { isRequirementMet: () => true },
    paymentPort: { tryConsumeResearchCost: () => true },
  });
  researchService.registerResearch({
    id: "research_test",
    displayName: "Research Test",
    tier: 4,
    durationMs: 60_000,
    cost: { silver: 500, materials: [{ itemId: "item_test", quantity: 2 }] },
    requirements: [],
    unlockIds: ["unlock_test"],
  });

  const expeditionService = new ExpeditionService<ExpeditionRequirement, unknown>({
    requirementPort: { isRequirementMet: () => true },
    slotCapacityPort: { getSlotCapacity: () => 1 },
    rewardPort: { grantCompletionReward: () => undefined },
  });
  expeditionService.registerExpedition({
    id: "expedition_test",
    typeId: "test",
    displayName: "Expedition Test",
    tier: 4,
    requirements: [],
  });

  return {
    researchService,
    expeditionService,
    foundation: createAcademyPresentationFoundation({ researchService, expeditionService }),
  };
}

describe("createAcademyPresentationFoundation", () => {
  it("projects research and expedition state without duplicating domain state", () => {
    const { foundation } = createFoundation();
    const initial = foundation.getModel();

    expect(initial.research[0]).toMatchObject({
      id: "research_test",
      state: "available",
      silverCost: 500,
      materials: [{ itemId: "item_test", quantity: 2 }],
    });
    expect(initial.expeditions[0]?.supportedDurationsMs).toEqual(EXPEDITION_DURATION_OPTIONS_MS);

    expect(foundation.startResearch("research_test").ok).toBe(true);
    expect(foundation.startExpedition("expedition_test", EXPEDITION_DURATION_OPTIONS_MS[0]).ok).toBe(true);

    const active = foundation.getModel();
    expect(active.research[0]).toMatchObject({ state: "active", remainingDurationMs: 60_000 });
    expect(active.expeditions[0]).toMatchObject({ active: true, activeSlotIndex: 0 });
  });
});

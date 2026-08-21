import { describe, expect, it, vi } from "vitest";
import { ResearchService } from "./research-service.js";
import type {
  ResearchDefinition,
  ResearchRequirementDefinition,
} from "./types.js";

type TestRequirement = ResearchRequirementDefinition & (
  | { readonly type: "flag"; readonly flagId: string }
  | { readonly type: "faction_relic"; readonly factionId: string }
);

function createDefinition(
  overrides: Partial<ResearchDefinition<TestRequirement>> = {},
): ResearchDefinition<TestRequirement> {
  return {
    id: "research_cartography_1",
    displayName: "Cartography I",
    tier: 4,
    durationMs: 60_000,
    cost: { silver: 0, materials: [] },
    requirements: [],
    unlockIds: ["expedition_system"],
    ...overrides,
  };
}

function createService(
  metRequirements: ReadonlySet<string> = new Set(),
  paymentResult = true,
): {
  readonly service: ResearchService<TestRequirement>;
  readonly tryConsumeResearchCost: ReturnType<typeof vi.fn>;
} {
  const tryConsumeResearchCost = vi.fn(() => paymentResult);
  const service = new ResearchService<TestRequirement>({
    requirementPort: {
      isRequirementMet(requirement) {
        if (requirement.type === "flag") return metRequirements.has(requirement.flagId);
        return metRequirements.has(`relic:${requirement.factionId}`);
      },
    },
    paymentPort: { tryConsumeResearchCost },
  });
  return { service, tryConsumeResearchCost };
}

describe("ResearchService", () => {
  it("registers authored definitions and rejects duplicate or invalid entries", () => {
    const { service } = createService();

    expect(service.registerResearch(createDefinition())).toEqual({ ok: true });
    expect(service.registerResearch(createDefinition())).toEqual({
      ok: false,
      reason: "duplicate_research",
    });
    expect(service.registerResearch(createDefinition({ durationMs: 0 }))).toEqual({
      ok: false,
      reason: "invalid_definition",
    });
  });

  it("uses generic authored requirements without faction-specific runtime branches", () => {
    const { service } = createService(new Set(["relic:keeper"]));
    service.registerResearch(createDefinition({
      id: "research_keeper_expedition",
      requirements: [{ type: "faction_relic", factionId: "keeper" }],
      unlockIds: ["expedition_family:keeper"],
    }));
    service.registerResearch(createDefinition({
      id: "research_morgana_expedition",
      requirements: [{ type: "faction_relic", factionId: "morgana" }],
      unlockIds: ["expedition_family:morgana"],
    }));

    expect(service.getEntryState("research_keeper_expedition")).toBe("available");
    expect(service.getEntryState("research_morgana_expedition")).toBe("locked");
  });

  it("checks requirements before consuming any research cost", () => {
    const { service, tryConsumeResearchCost } = createService();
    service.registerResearch(createDefinition({
      requirements: [{ type: "flag", flagId: "academy_ready" }],
      cost: { silver: 500, materials: [{ itemId: "item_stone", quantity: 5 }] },
    }));

    expect(service.startResearch("research_cartography_1")).toEqual({
      ok: false,
      reason: "requirements_not_met",
    });
    expect(tryConsumeResearchCost).not.toHaveBeenCalled();
  });

  it("starts only one research at a time and delegates payment atomically", () => {
    const { service, tryConsumeResearchCost } = createService();
    const first = createDefinition();
    const second = createDefinition({
      id: "research_archaeology_1",
      displayName: "Archaeology I",
      unlockIds: ["relic_tracking"],
    });
    service.registerResearch(first);
    service.registerResearch(second);

    expect(service.startResearch(first.id)).toEqual({
      ok: true,
      activeResearch: { researchId: first.id, remainingDurationMs: first.durationMs },
    });
    expect(tryConsumeResearchCost).toHaveBeenCalledWith(first.cost);
    expect(service.startResearch(second.id)).toEqual({
      ok: false,
      reason: "research_slot_occupied",
    });
    expect(tryConsumeResearchCost).toHaveBeenCalledTimes(1);
  });

  it("does not start a research when the atomic payment port rejects the cost", () => {
    const { service } = createService(new Set(), false);
    service.registerResearch(createDefinition());

    expect(service.startResearch("research_cartography_1")).toEqual({
      ok: false,
      reason: "payment_failed",
    });
    expect(service.getActiveResearch()).toBeUndefined();
  });

  it("advances from authoritative elapsed time and grants completion automatically", () => {
    const { service } = createService();
    service.registerResearch(createDefinition());
    service.startResearch("research_cartography_1");

    expect(service.advance(20_000)).toEqual({
      completedResearchId: undefined,
      activeResearch: {
        researchId: "research_cartography_1",
        remainingDurationMs: 40_000,
      },
    });
    expect(service.advance(40_000)).toEqual({
      completedResearchId: "research_cartography_1",
      activeResearch: undefined,
    });
    expect(service.hasCompleted("research_cartography_1")).toBe(true);
    expect(service.getEntryState("research_cartography_1")).toBe("completed");
  });

  it("derives functional unlocks from completed research definitions", () => {
    const { service } = createService();
    service.registerResearch(createDefinition({
      unlockIds: ["expedition_system", "expedition_tier:4"],
    }));
    service.startResearch("research_cartography_1");

    expect(service.hasUnlock("expedition_system")).toBe(false);
    service.advance(60_000);
    expect(service.hasUnlock("expedition_system")).toBe(true);
    expect(service.hasUnlock("expedition_tier:4")).toBe(true);
  });

  it("persists active/completed state while ignoring definitions no longer authored", () => {
    const first = createService().service;
    first.registerResearch(createDefinition());
    first.startResearch("research_cartography_1");
    first.advance(15_000);
    const activeSnapshot = first.save();

    const restored = createService().service;
    restored.registerResearch(createDefinition());
    restored.load(activeSnapshot);
    expect(restored.getActiveResearch()).toEqual({
      researchId: "research_cartography_1",
      remainingDurationMs: 45_000,
    });

    restored.advance(45_000);
    const completedSnapshot = restored.save();
    const withoutDefinition = createService().service;
    withoutDefinition.load(completedSnapshot);
    expect(withoutDefinition.getCompletedResearchIds()).toEqual([]);
    expect(withoutDefinition.getActiveResearch()).toBeUndefined();
  });

  it("rejects invalid elapsed time instead of using a local clock fallback", () => {
    const { service } = createService();
    service.registerResearch(createDefinition());
    service.startResearch("research_cartography_1");

    expect(() => service.advance(-1)).toThrow(
      "Research elapsed time must be a finite non-negative number",
    );
  });
});

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

  it("starts independent researches simultaneously and delegates every payment atomically", () => {
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
    expect(service.startResearch(second.id)).toEqual({
      ok: true,
      activeResearch: { researchId: second.id, remainingDurationMs: second.durationMs },
    });
    expect(service.getActiveResearches()).toHaveLength(2);
    expect(tryConsumeResearchCost).toHaveBeenCalledTimes(2);
    expect(service.startResearch(second.id)).toEqual({ ok: false, reason: "already_active" });
  });

  it("does not start a research when the atomic payment port rejects the cost", () => {
    const { service } = createService(new Set(), false);
    service.registerResearch(createDefinition());

    expect(service.startResearch("research_cartography_1")).toEqual({
      ok: false,
      reason: "payment_failed",
    });
    expect(service.getActiveResearches()).toEqual([]);
  });

  it("advances all active researches from the same authoritative elapsed time", () => {
    const { service } = createService();
    service.registerResearch(createDefinition());
    service.registerResearch(createDefinition({
      id: "research_archaeology_1",
      durationMs: 40_000,
      unlockIds: ["relic_tracking"],
    }));
    service.startResearch("research_cartography_1");
    service.startResearch("research_archaeology_1");

    expect(service.advance(20_000)).toEqual({
      completedResearchIds: [],
      activeResearches: [
        { researchId: "research_cartography_1", remainingDurationMs: 40_000 },
        { researchId: "research_archaeology_1", remainingDurationMs: 20_000 },
      ],
    });
    expect(service.advance(20_000)).toEqual({
      completedResearchIds: ["research_archaeology_1"],
      activeResearches: [
        { researchId: "research_cartography_1", remainingDurationMs: 20_000 },
      ],
    });
    expect(service.advance(20_000)).toEqual({
      completedResearchIds: ["research_cartography_1"],
      activeResearches: [],
    });
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

  it("persists parallel active state and migrates the legacy single-active snapshot", () => {
    const first = createService().service;
    const cartography = createDefinition();
    const archaeology = createDefinition({
      id: "research_archaeology_1",
      unlockIds: ["relic_tracking"],
    });
    first.registerResearch(cartography);
    first.registerResearch(archaeology);
    first.startResearch(cartography.id);
    first.startResearch(archaeology.id);
    first.advance(15_000);

    const restored = createService().service;
    restored.registerResearch(cartography);
    restored.registerResearch(archaeology);
    restored.load(first.save());
    expect(restored.getActiveResearches()).toEqual([
      { researchId: cartography.id, remainingDurationMs: 45_000 },
      { researchId: archaeology.id, remainingDurationMs: 45_000 },
    ]);

    const legacy = createService().service;
    legacy.registerResearch(cartography);
    legacy.load({
      version: 1,
      completedResearchIds: [],
      activeResearch: { researchId: cartography.id, remainingDurationMs: 30_000 },
    });
    expect(legacy.getActiveResearches()).toEqual([
      { researchId: cartography.id, remainingDurationMs: 30_000 },
    ]);
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

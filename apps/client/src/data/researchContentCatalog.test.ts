import { describe, expect, it } from "vitest";
import { RESEARCH_DEFINITIONS, RESEARCH_UNLOCK_IDS } from "./researchContentCatalog.js";

describe("T4 Academy foundational research", () => {
  it("authors validated Cartography I tuning and unlock", () => {
    const definition = RESEARCH_DEFINITIONS.find((entry) => entry.id === "research_cartography_1");
    expect(definition).toBeDefined();
    expect(definition?.tier).toBe(4);
    expect(definition?.durationMs).toBe(30 * 60 * 1000);
    expect(definition?.cost).toEqual({ silver: 5_000, materials: [] });
    expect(definition?.requirements).toEqual([{ type: "academy_tier", minimumTier: 4 }]);
    expect(definition?.unlockIds).toEqual([RESEARCH_UNLOCK_IDS.expeditionTier4]);
  });

  it("authors validated Archaeology I tuning and unlock", () => {
    const definition = RESEARCH_DEFINITIONS.find((entry) => entry.id === "research_archaeology_1");
    expect(definition).toBeDefined();
    expect(definition?.tier).toBe(4);
    expect(definition?.durationMs).toBe(20 * 60 * 1000);
    expect(definition?.cost).toEqual({ silver: 2_500, materials: [] });
    expect(definition?.requirements).toEqual([{ type: "academy_tier", minimumTier: 4 }]);
    expect(definition?.unlockIds).toEqual([RESEARCH_UNLOCK_IDS.relicReconstruction]);
  });

  it("keeps every authored research gated by the Academy tier", () => {
    for (const definition of RESEARCH_DEFINITIONS) {
      expect(definition.requirements.some((requirement) => (
        requirement.type === "academy_tier" && requirement.minimumTier <= definition.tier
      ))).toBe(true);
    }
  });
});

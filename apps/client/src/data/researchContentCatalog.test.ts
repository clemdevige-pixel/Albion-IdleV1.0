import { describe, expect, it } from "vitest";
import type { ResearchDefinition } from "@game/gameplay";
import {
  RESEARCH_DEFINITIONS,
  RESEARCH_UNLOCK_IDS,
  type ResearchContentRequirement,
} from "./researchContentCatalog.js";

function hasAcademyTierRequirement(
  definition: ResearchDefinition<ResearchContentRequirement>,
): boolean {
  return definition.requirements.some((requirement) => (
    requirement.type === "academy_tier"
    && requirement.minimumTier <= definition.tier
  ));
}

const CARTOGRAPHY = [
  ["research_cartography_1", 4, 5_000, 30, RESEARCH_UNLOCK_IDS.expeditionTier4],
  ["research_cartography_2", 5, 15_000, 60, RESEARCH_UNLOCK_IDS.expeditionTier5],
  ["research_cartography_3", 6, 40_000, 120, RESEARCH_UNLOCK_IDS.expeditionTier6],
  ["research_cartography_4", 7, 70_000, 180, RESEARCH_UNLOCK_IDS.expeditionTier7],
  ["research_cartography_5", 8, 110_000, 240, RESEARCH_UNLOCK_IDS.expeditionTier8],
] as const;

const FACTIONS = ["keeper", "heretic", "undead", "morgana"] as const;

describe("Academy research content", () => {
  it("authors the validated Cartography T4-T8 progression", () => {
    for (const [id, tier, silver, minutes, unlockId] of CARTOGRAPHY) {
      const definition = RESEARCH_DEFINITIONS.find((entry) => entry.id === id);
      expect(definition).toBeDefined();
      expect(definition?.tier).toBe(tier);
      expect(definition?.durationMs).toBe(minutes * 60 * 1000);
      expect(definition?.cost).toEqual({ silver, materials: [] });
      expect(definition?.unlockIds).toContain(unlockId);
    }
    expect(RESEARCH_DEFINITIONS.find((entry) => entry.id === "research_cartography_3")?.unlockIds)
      .toContain(RESEARCH_UNLOCK_IDS.secondExpeditionSlot);
  });

  it("chains every Cartography tier after the previous unlock", () => {
    for (let index = 1; index < CARTOGRAPHY.length; index += 1) {
      const current = CARTOGRAPHY[index];
      const previous = CARTOGRAPHY[index - 1];
      if (current === undefined || previous === undefined) continue;
      const definition = RESEARCH_DEFINITIONS.find((entry) => entry.id === current[0]);
      expect(definition?.requirements).toContainEqual({
        type: "research_unlock",
        unlockId: previous[4],
      });
    }
  });

  it("keeps Archaeology I as the single T4 relic examination unlock", () => {
    const definition = RESEARCH_DEFINITIONS.find((entry) => entry.id === "research_archaeology_1");
    expect(definition?.tier).toBe(4);
    expect(definition?.durationMs).toBe(20 * 60 * 1000);
    expect(definition?.cost).toEqual({ silver: 2_500, materials: [] });
    expect(definition?.unlockIds).toEqual([RESEARCH_UNLOCK_IDS.relicReconstruction]);
  });

  it("keeps only faction Dungeon location Research after Relic examination", () => {
    for (const factionId of FACTIONS) {
      const expeditionStudy = RESEARCH_DEFINITIONS.find((entry) => (
        entry.id === `research_${factionId}_expedition_study`
      ));
      const dungeon = RESEARCH_DEFINITIONS.find((entry) => (
        entry.id === `research_${factionId}_dungeon_location`
      ));

      expect(expeditionStudy).toBeUndefined();
      expect(dungeon?.cost).toEqual({ silver: 10_000, materials: [] });
      expect(dungeon?.durationMs).toBe(60 * 60 * 1000);
      expect(dungeon?.requirements).toContainEqual({
        type: "relic_examined",
        relicId: `relic_${factionId}`,
      });
      expect(dungeon?.unlockIds).toEqual([`dungeon_family:${factionId}`]);
    }
  });

  it("keeps every authored Research gated by its Academy tier", () => {
    for (const definition of RESEARCH_DEFINITIONS) {
      expect(hasAcademyTierRequirement(definition)).toBe(true);
    }
  });
});

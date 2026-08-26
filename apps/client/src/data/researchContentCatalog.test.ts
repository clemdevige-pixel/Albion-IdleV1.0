import { describe, expect, it } from "vitest";
import type { ResearchDefinition } from "@game/gameplay";
import { DUNGEON_RELIC_ID } from "./relicContentCatalog.js";
import {
  RESEARCH_DEFINITIONS,
  RESEARCH_IDS,
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

const CURVE = [
  [4, 5_000, 30],
  [5, 15_000, 60],
  [6, 40_000, 120],
  [7, 70_000, 180],
  [8, 110_000, 240],
] as const;

const CARTOGRAPHY_IDS = [
  RESEARCH_IDS.cartography1,
  RESEARCH_IDS.cartography2,
  RESEARCH_IDS.cartography3,
  RESEARCH_IDS.cartography4,
  RESEARCH_IDS.cartography5,
] as const;
const CARTOGRAPHY_UNLOCKS = [
  RESEARCH_UNLOCK_IDS.silverExpeditionTier4,
  RESEARCH_UNLOCK_IDS.silverExpeditionTier5,
  RESEARCH_UNLOCK_IDS.silverExpeditionTier6,
  RESEARCH_UNLOCK_IDS.silverExpeditionTier7,
  RESEARCH_UNLOCK_IDS.silverExpeditionTier8,
] as const;
const ARCHAEOLOGY_IDS = [
  RESEARCH_IDS.archaeology1,
  RESEARCH_IDS.archaeology2,
  RESEARCH_IDS.archaeology3,
  RESEARCH_IDS.archaeology4,
  RESEARCH_IDS.archaeology5,
] as const;
const ARCHAEOLOGY_UNLOCKS = [
  RESEARCH_UNLOCK_IDS.factionExpeditionTier4,
  RESEARCH_UNLOCK_IDS.factionExpeditionTier5,
  RESEARCH_UNLOCK_IDS.factionExpeditionTier6,
  RESEARCH_UNLOCK_IDS.factionExpeditionTier7,
  RESEARCH_UNLOCK_IDS.factionExpeditionTier8,
] as const;

describe("Academy research content", () => {
  it("uses the same validated T4-T8 cost/duration curve for Cartography and Archaeology", () => {
    for (let index = 0; index < CURVE.length; index += 1) {
      const curve = CURVE[index];
      const cartographyId = CARTOGRAPHY_IDS[index];
      const archaeologyId = ARCHAEOLOGY_IDS[index];
      const cartographyUnlock = CARTOGRAPHY_UNLOCKS[index];
      const archaeologyUnlock = ARCHAEOLOGY_UNLOCKS[index];
      if (
        curve === undefined
        || cartographyId === undefined
        || archaeologyId === undefined
        || cartographyUnlock === undefined
        || archaeologyUnlock === undefined
      ) continue;
      const [tier, silver, minutes] = curve;
      for (const [id, unlockId] of [
        [cartographyId, cartographyUnlock],
        [archaeologyId, archaeologyUnlock],
      ] as const) {
        const definition = RESEARCH_DEFINITIONS.find((entry) => entry.id === id);
        expect(definition?.tier).toBe(tier);
        expect(definition?.durationMs).toBe(minutes * 60 * 1000);
        expect(definition?.cost).toEqual({ silver, materials: [] });
        expect(definition?.unlockIds).toContain(unlockId);
      }
    }
  });

  it("chains Cartography and Archaeology independently tier by tier", () => {
    for (let index = 1; index < CARTOGRAPHY_IDS.length; index += 1) {
      const cartography = RESEARCH_DEFINITIONS.find((entry) => entry.id === CARTOGRAPHY_IDS[index]);
      const archaeology = RESEARCH_DEFINITIONS.find((entry) => entry.id === ARCHAEOLOGY_IDS[index]);
      expect(cartography?.requirements).toContainEqual({
        type: "research_unlock",
        unlockId: CARTOGRAPHY_UNLOCKS[index - 1],
      });
      expect(archaeology?.requirements).toContainEqual({
        type: "research_unlock",
        unlockId: ARCHAEOLOGY_UNLOCKS[index - 1],
      });
    }
    expect(RESEARCH_DEFINITIONS.find((entry) => entry.id === RESEARCH_IDS.cartography3)?.unlockIds)
      .toContain(RESEARCH_UNLOCK_IDS.secondExpeditionSlot);
  });

  it("authors the discovery-driven T4 enchantment Research", () => {
    const definition = RESEARCH_DEFINITIONS.find((entry) => entry.id === RESEARCH_IDS.enchantmentStudy);
    expect(definition?.tier).toBe(4);
    expect(definition?.durationMs).toBe(10 * 60 * 1000);
    expect(definition?.cost).toEqual({ silver: 5_000, materials: [] });
    expect(definition?.requirements).toContainEqual({ type: "academy_tier", minimumTier: 4 });
    expect(definition?.requirements).toContainEqual({ type: "enchantment_shard_discovered" });
    expect(definition?.unlockIds).toEqual([RESEARCH_UNLOCK_IDS.enchantmentService]);
  });

  it("authors the T6 advanced worker organization unlock", () => {
    const definition = RESEARCH_DEFINITIONS.find((entry) => entry.id === RESEARCH_IDS.workerOrganization);
    expect(definition?.tier).toBe(6);
    expect(definition?.durationMs).toBe(150 * 60 * 1000);
    expect(definition?.cost).toEqual({ silver: 60_000, materials: [] });
    expect(definition?.requirements).toContainEqual({ type: "academy_tier", minimumTier: 6 });
    expect(definition?.unlockIds).toEqual([RESEARCH_UNLOCK_IDS.advancedWorkerOrganization]);
  });

  it("authors the T7 instant refining unlock", () => {
    const definition = RESEARCH_DEFINITIONS.find((entry) => entry.id === RESEARCH_IDS.instantRefining);
    expect(definition?.tier).toBe(7);
    expect(definition?.durationMs).toBe(3 * 60 * 60 * 1000);
    expect(definition?.cost).toEqual({ silver: 80_000, materials: [] });
    expect(definition?.requirements).toContainEqual({ type: "academy_tier", minimumTier: 7 });
    expect(definition?.unlockIds).toEqual([RESEARCH_UNLOCK_IDS.instantRefining]);
  });

  it("uses one charged-Relic analysis to unlock the complete Dungeon discovery loop", () => {
    const analysis = RESEARCH_DEFINITIONS.find((entry) => entry.id === RESEARCH_IDS.dungeonRelicAnalysis);
    expect(analysis?.tier).toBe(4);
    expect(analysis?.durationMs).toBe(10 * 60 * 1000);
    expect(analysis?.cost).toEqual({ silver: 10_000, materials: [] });
    expect(analysis?.requirements).toContainEqual({ type: "academy_tier", minimumTier: 4 });
    expect(analysis?.requirements).toContainEqual({ type: "relic_charged", relicId: DUNGEON_RELIC_ID });
    expect(analysis?.unlockIds).toEqual([
      RESEARCH_UNLOCK_IDS.dungeonRelicAnalyzed,
      RESEARCH_UNLOCK_IDS.dungeonSystem,
      RESEARCH_UNLOCK_IDS.factionRuneWorldDrop,
    ]);
    expect(analysis?.legacyIds).toEqual([RESEARCH_IDS.dungeonSanctuaryLocation]);
    expect(RESEARCH_DEFINITIONS.some((entry) => entry.id === RESEARCH_IDS.dungeonSanctuaryLocation)).toBe(false);
  });

  it("keeps every authored Research gated by its Academy tier", () => {
    for (const definition of RESEARCH_DEFINITIONS) {
      expect(hasAcademyTierRequirement(definition)).toBe(true);
    }
  });
});

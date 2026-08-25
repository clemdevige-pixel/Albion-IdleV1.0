import { describe, expect, it } from "vitest";
import type { IslandBuildingId } from "@game/data";
import { RESEARCH_IDS } from "../../data/researchContentCatalog.js";
import type { AcademyResearchEntryModel } from "../../runtime/bootstrap/createAcademyPresentationFoundation.js";
import {
  resolveBlueOnboardingStep,
  type BlueOnboardingSnapshot,
} from "./blueOnboardingModel.js";

function research(
  id: string,
  state: AcademyResearchEntryModel["state"],
): AcademyResearchEntryModel {
  return {
    id,
    displayName: id,
    tier: 4,
    state,
    durationMs: 0,
    remainingDurationMs: undefined,
    silverCost: 0,
    materials: [],
  };
}

function buildings(...ids: IslandBuildingId[]): ReadonlySet<IslandBuildingId> {
  return new Set(ids);
}

function snapshot(overrides: Partial<BlueOnboardingSnapshot> = {}): BlueOnboardingSnapshot {
  return {
    buildingIds: buildings(),
    workerStarted: false,
    hasChestArmorTier3OrHigher: false,
    hasEquippedTier4OrHigher: false,
    hasProgressedBeyondEarlyProduction: false,
    academyResearch: [],
    hasReachedFrostpeak: false,
    relicState: "unobtained",
    dungeonUnlocked: false,
    activeDungeon: false,
    clearedDungeonTiers: [],
    artifactWeaponOwned: false,
    artifactStage: "artifacts",
    beyondBlueOnboarding: false,
    ...overrides,
  };
}

const EARLY_READY = {
  buildingIds: buildings("mine", "workshop"),
  workerStarted: true,
  hasChestArmorTier3OrHigher: true,
  hasEquippedTier4OrHigher: true,
} as const;

const COMPLETED_RESEARCH = [
  research(RESEARCH_IDS.enchantmentStudy, "completed"),
  research(RESEARCH_IDS.dungeonRelicAnalysis, "completed"),
  research(RESEARCH_IDS.dungeonSanctuaryLocation, "completed"),
];

describe("resolveBlueOnboardingStep", () => {
  it("starts with the first gathering milestone", () => {
    expect(resolveBlueOnboardingStep(snapshot())?.id).toBe("build_gathering");
  });

  it("moves from gathering to worker then workshop", () => {
    expect(resolveBlueOnboardingStep(snapshot({
      buildingIds: buildings("mine"),
    }))?.id).toBe("start_worker");

    expect(resolveBlueOnboardingStep(snapshot({
      buildingIds: buildings("mine"),
      workerStarted: true,
    }))?.id).toBe("build_workshop");
  });

  it("requires specifically a T3-or-higher chest milestone", () => {
    expect(resolveBlueOnboardingStep(snapshot({
      buildingIds: buildings("mine", "workshop"),
      workerStarted: true,
    }))?.id).toBe("craft_t3_chest");
  });

  it("guides the player to equip a first T4 piece after the T3 chest milestone", () => {
    expect(resolveBlueOnboardingStep(snapshot({
      buildingIds: buildings("mine", "workshop"),
      workerStarted: true,
      hasChestArmorTier3OrHigher: true,
    }))?.id).toBe("equip_t4");

    expect(resolveBlueOnboardingStep(snapshot(EARLY_READY))?.id).toBe("progress_blue");
  });

  it("keeps T4 equipment guidance before available enchantment research", () => {
    expect(resolveBlueOnboardingStep(snapshot({
      buildingIds: buildings("mine", "workshop"),
      workerStarted: true,
      hasChestArmorTier3OrHigher: true,
      academyResearch: [research(RESEARCH_IDS.enchantmentStudy, "available")],
    }))?.id).toBe("equip_t4");

    expect(resolveBlueOnboardingStep(snapshot({
      ...EARLY_READY,
      academyResearch: [research(RESEARCH_IDS.enchantmentStudy, "available")],
    }))?.id).toBe("unlock_enchantment");
  });

  it("skips obsolete production milestones for a player farther into Blue", () => {
    expect(resolveBlueOnboardingStep(snapshot({
      hasProgressedBeyondEarlyProduction: true,
      hasEquippedTier4OrHigher: true,
    }))?.id).toBe("progress_blue");
  });

  it("does not force a T4 regression once enchantment research is already completed", () => {
    expect(resolveBlueOnboardingStep(snapshot({
      academyResearch: [research(RESEARCH_IDS.enchantmentStudy, "completed")],
    }))?.id).toBe("reach_frostpeak");
  });

  it("guides enchantment research without requiring a real enchant action", () => {
    expect(resolveBlueOnboardingStep(snapshot({
      ...EARLY_READY,
      academyResearch: [research(RESEARCH_IDS.enchantmentStudy, "available")],
    }))?.id).toBe("unlock_enchantment");

    expect(resolveBlueOnboardingStep(snapshot({
      ...EARLY_READY,
      academyResearch: [research(RESEARCH_IDS.enchantmentStudy, "completed")],
    }))?.id).toBe("reach_frostpeak");
  });

  it("uses Frostpeak and relic canonical state for the discovery milestone", () => {
    expect(resolveBlueOnboardingStep(snapshot({
      ...EARLY_READY,
      academyResearch: [research(RESEARCH_IDS.enchantmentStudy, "completed")],
      hasReachedFrostpeak: true,
      relicState: "unobtained",
    }))?.id).toBe("discover_relic");

    expect(resolveBlueOnboardingStep(snapshot({
      ...EARLY_READY,
      academyResearch: [
        research(RESEARCH_IDS.enchantmentStudy, "completed"),
        research(RESEARCH_IDS.dungeonRelicAnalysis, "available"),
      ],
      hasReachedFrostpeak: true,
      relicState: "charged",
    }))?.id).toBe("analyze_relic");
  });

  it("guides sanctuary research after relic analysis", () => {
    expect(resolveBlueOnboardingStep(snapshot({
      ...EARLY_READY,
      academyResearch: [
        research(RESEARCH_IDS.enchantmentStudy, "completed"),
        research(RESEARCH_IDS.dungeonRelicAnalysis, "completed"),
        research(RESEARCH_IDS.dungeonSanctuaryLocation, "available"),
      ],
      hasReachedFrostpeak: true,
      relicState: "examined",
    }))?.id).toBe("locate_sanctuaries");
  });

  it("distinguishes entering from clearing the first T4 dungeon", () => {
    const dungeonReady = {
      ...EARLY_READY,
      academyResearch: COMPLETED_RESEARCH,
      hasReachedFrostpeak: true,
      relicState: "examined" as const,
      dungeonUnlocked: true,
    };

    expect(resolveBlueOnboardingStep(snapshot(dungeonReady))?.id).toBe("enter_t4_dungeon");
    expect(resolveBlueOnboardingStep(snapshot({
      ...dungeonReady,
      activeDungeon: true,
    }))?.id).toBe("clear_t4_dungeon");
  });

  it("shows Artifacts then Artifact weapons after the first T4 clear", () => {
    const ready = snapshot({
      ...EARLY_READY,
      academyResearch: COMPLETED_RESEARCH,
      hasReachedFrostpeak: true,
      relicState: "examined",
      dungeonUnlocked: true,
      clearedDungeonTiers: [4],
    });

    expect(resolveBlueOnboardingStep(ready)?.id).toBe("artifact_fragments");
    expect(resolveBlueOnboardingStep({
      ...ready,
      artifactStage: "artifact_weapons",
    })?.id).toBe("artifact_weapons");
    expect(resolveBlueOnboardingStep({
      ...ready,
      artifactStage: "done",
    })).toBeNull();
  });

  it("does not require crafting an Artifact weapon and skips the intro when one is already owned", () => {
    expect(resolveBlueOnboardingStep(snapshot({
      ...EARLY_READY,
      academyResearch: COMPLETED_RESEARCH,
      hasReachedFrostpeak: true,
      relicState: "examined",
      dungeonUnlocked: true,
      clearedDungeonTiers: [4],
      artifactWeaponOwned: true,
    }))).toBeNull();
  });

  it("returns null for a save already beyond the Blue onboarding scope", () => {
    expect(resolveBlueOnboardingStep(snapshot({ beyondBlueOnboarding: true }))).toBeNull();
  });
});

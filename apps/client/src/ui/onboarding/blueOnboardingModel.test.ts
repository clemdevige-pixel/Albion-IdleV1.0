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
    hasT3Armor: false,
    academyResearch: [],
    dungeonUnlocked: false,
    clearedDungeonTiers: [],
    artifactWeaponOwned: false,
    artifactIntroDismissed: false,
    ...overrides,
  };
}

describe("resolveBlueOnboardingStep", () => {
  it("starts with a gathering building and never requires a tutorial flag", () => {
    expect(resolveBlueOnboardingStep(snapshot())?.id).toBe("build_gathering");
  });

  it("skips already-satisfied early milestones", () => {
    const step = resolveBlueOnboardingStep(snapshot({
      buildingIds: buildings("mine", "workshop"),
      workerStarted: true,
      hasT3Armor: true,
      academyResearch: [research(RESEARCH_IDS.enchantmentStudy, "locked")],
    }));

    expect(step?.id).toBe("discover_enchantment");
  });

  it("waits for enchantment research completion before pointing toward Frostpeak", () => {
    const base = {
      buildingIds: buildings("mine", "workshop"),
      workerStarted: true,
      hasT3Armor: true,
    } as const;

    expect(resolveBlueOnboardingStep(snapshot({
      ...base,
      academyResearch: [research(RESEARCH_IDS.enchantmentStudy, "active")],
    }))?.id).toBe("unlock_enchantment");

    expect(resolveBlueOnboardingStep(snapshot({
      ...base,
      academyResearch: [
        research(RESEARCH_IDS.enchantmentStudy, "completed"),
        research(RESEARCH_IDS.dungeonRelicAnalysis, "locked"),
      ],
    }))?.id).toBe("reach_relic");
  });

  it("guides relic analysis and sanctuary research from their canonical states", () => {
    const baseResearch = [research(RESEARCH_IDS.enchantmentStudy, "completed")];
    const base = {
      buildingIds: buildings("mine", "workshop"),
      workerStarted: true,
      hasT3Armor: true,
    } as const;

    expect(resolveBlueOnboardingStep(snapshot({
      ...base,
      academyResearch: [
        ...baseResearch,
        research(RESEARCH_IDS.dungeonRelicAnalysis, "available"),
      ],
    }))?.id).toBe("analyze_relic");

    expect(resolveBlueOnboardingStep(snapshot({
      ...base,
      academyResearch: [
        ...baseResearch,
        research(RESEARCH_IDS.dungeonRelicAnalysis, "completed"),
        research(RESEARCH_IDS.dungeonSanctuaryLocation, "available"),
      ],
    }))?.id).toBe("locate_sanctuaries");
  });

  it("ends with a dismissible artifact introduction after the first T4 clear", () => {
    const completedResearch = [
      research(RESEARCH_IDS.enchantmentStudy, "completed"),
      research(RESEARCH_IDS.dungeonRelicAnalysis, "completed"),
      research(RESEARCH_IDS.dungeonSanctuaryLocation, "completed"),
    ];
    const ready = snapshot({
      buildingIds: buildings("mine", "workshop"),
      workerStarted: true,
      hasT3Armor: true,
      academyResearch: completedResearch,
      dungeonUnlocked: true,
      clearedDungeonTiers: [4],
    });

    expect(resolveBlueOnboardingStep(ready)?.id).toBe("artifact_intro");
    expect(resolveBlueOnboardingStep({ ...ready, artifactIntroDismissed: true })).toBeNull();
    expect(resolveBlueOnboardingStep({ ...ready, artifactWeaponOwned: true })).toBeNull();
  });
});

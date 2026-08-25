import { describe, expect, it } from "vitest";
import {
  resolveOnboardingGuidance,
  type OnboardingSnapshot,
} from "./onboardingResolver";

const BASE: OnboardingSnapshot = {
  hasGatheringBuilding: false,
  hasWorkingWorker: false,
  hasWorkshop: false,
  hasChestTier3OrHigher: false,
  hasProgressedBeyondEarlyProduction: false,
  enchantmentResearchState: "locked",
  hasReachedFrostpeak: false,
  relicState: "unobtained",
  relicResearchState: "locked",
  sanctuaryResearchState: "locked",
  dungeonUnlocked: false,
  hasActiveDungeon: false,
  hasClearedT4Dungeon: false,
  beyondBlueOnboarding: false,
  terminalStage: "artifacts",
};

function resolve(patch: Partial<OnboardingSnapshot> = {}) {
  return resolveOnboardingGuidance({ ...BASE, ...patch });
}

describe("resolveOnboardingGuidance", () => {
  it("starts with the first gathering line", () => {
    expect(resolve()?.id).toBe("build_gathering");
  });

  it("moves to worker guidance after a gathering building exists", () => {
    expect(resolve({ hasGatheringBuilding: true })?.id).toBe("recruit_worker");
  });

  it("moves to refining/workshop after a worker is working", () => {
    expect(resolve({ hasGatheringBuilding: true, hasWorkingWorker: true })?.id).toBe("refine_and_workshop");
  });

  it("requires the chest milestone rather than any generic gear", () => {
    expect(resolve({
      hasGatheringBuilding: true,
      hasWorkingWorker: true,
      hasWorkshop: true,
    })?.id).toBe("craft_t3_chest");
  });

  it("skips the chest milestone when a T3-or-higher chest already exists", () => {
    expect(resolve({
      hasGatheringBuilding: true,
      hasWorkingWorker: true,
      hasWorkshop: true,
      hasChestTier3OrHigher: true,
    })?.id).toBe("blue_progression");
  });

  it("skips obsolete production milestones for a player farther into Blue", () => {
    expect(resolve({ hasProgressedBeyondEarlyProduction: true })?.id).toBe("blue_progression");
  });

  it("points to enchantment when that research is available", () => {
    expect(resolve({ enchantmentResearchState: "available" })?.id).toBe("enchantment_research");
  });

  it("does not require a real enchant action after research completion", () => {
    expect(resolve({ enchantmentResearchState: "completed" })?.id).toBe("reach_frostpeak");
  });

  it("resolves Frostpeak relic discovery from canonical relic state", () => {
    expect(resolve({
      enchantmentResearchState: "completed",
      hasReachedFrostpeak: true,
    })?.id).toBe("discover_relic");
  });

  it("guides relic analysis after the relic exists", () => {
    expect(resolve({
      enchantmentResearchState: "completed",
      hasReachedFrostpeak: true,
      relicState: "charged",
      relicResearchState: "available",
    })?.id).toBe("research_relic");
  });

  it("guides sanctuary research after relic analysis", () => {
    expect(resolve({
      enchantmentResearchState: "completed",
      hasReachedFrostpeak: true,
      relicState: "examined",
      relicResearchState: "completed",
      sanctuaryResearchState: "available",
    })?.id).toBe("unlock_dungeons");
  });

  it("distinguishes entering from clearing the first dungeon", () => {
    const common = {
      enchantmentResearchState: "completed" as const,
      hasReachedFrostpeak: true,
      relicState: "examined" as const,
      relicResearchState: "completed" as const,
      sanctuaryResearchState: "completed" as const,
      dungeonUnlocked: true,
    };
    expect(resolve(common)?.id).toBe("enter_t4_dungeon");
    expect(resolve({ ...common, hasActiveDungeon: true })?.id).toBe("clear_t4_dungeon");
  });

  it("shows the two explanatory artifact steps after the T4 clear then ends", () => {
    const common = {
      enchantmentResearchState: "completed" as const,
      hasReachedFrostpeak: true,
      relicState: "examined" as const,
      relicResearchState: "completed" as const,
      sanctuaryResearchState: "completed" as const,
      dungeonUnlocked: true,
      hasClearedT4Dungeon: true,
    };
    expect(resolve({ ...common, terminalStage: "artifacts" })?.id).toBe("introduce_artifacts");
    expect(resolve({ ...common, terminalStage: "artifact_weapons" })?.id).toBe("introduce_artifact_weapons");
    expect(resolve({ ...common, terminalStage: "done" })).toBeNull();
  });

  it("returns null for saves already beyond the Blue onboarding scope", () => {
    expect(resolve({ beyondBlueOnboarding: true })).toBeNull();
  });
});

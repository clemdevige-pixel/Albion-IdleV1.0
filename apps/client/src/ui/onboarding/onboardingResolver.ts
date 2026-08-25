import {
  ONBOARDING_CONTENT,
  type OnboardingContentEntry,
} from "../../data/onboardingContentCatalog";

export type OnboardingResearchState = "locked" | "available" | "active" | "completed";
export type OnboardingRelicState = "unobtained" | "broken" | "charged" | "examined";
export type OnboardingTerminalStage = "artifacts" | "artifact_weapons" | "done";

export interface OnboardingSnapshot {
  readonly hasGatheringBuilding: boolean;
  readonly hasWorkingWorker: boolean;
  readonly hasWorkshop: boolean;
  readonly hasChestTier3OrHigher: boolean;
  readonly hasProgressedBeyondEarlyProduction: boolean;
  readonly enchantmentResearchState: OnboardingResearchState;
  readonly hasReachedFrostpeak: boolean;
  readonly relicState: OnboardingRelicState;
  readonly relicResearchState: OnboardingResearchState;
  readonly sanctuaryResearchState: OnboardingResearchState;
  readonly dungeonUnlocked: boolean;
  readonly hasActiveDungeon: boolean;
  readonly hasClearedT4Dungeon: boolean;
  readonly beyondBlueOnboarding: boolean;
  readonly terminalStage: OnboardingTerminalStage;
}

export type OnboardingGuidance = OnboardingContentEntry;

/**
 * Presentation-only resolver. It derives the next pedagogical suggestion from
 * authoritative game state and never participates in unlock/progression rules.
 */
export function resolveOnboardingGuidance(snapshot: OnboardingSnapshot): OnboardingGuidance | null {
  if (snapshot.beyondBlueOnboarding) return null;

  const laterProgressMakesProductionObsolete =
    snapshot.hasProgressedBeyondEarlyProduction
    || snapshot.enchantmentResearchState !== "locked"
    || snapshot.hasReachedFrostpeak
    || snapshot.relicState !== "unobtained"
    || snapshot.dungeonUnlocked
    || snapshot.hasClearedT4Dungeon;

  if (!laterProgressMakesProductionObsolete) {
    if (!snapshot.hasGatheringBuilding) return ONBOARDING_CONTENT.build_gathering;
    if (!snapshot.hasWorkingWorker) return ONBOARDING_CONTENT.recruit_worker;
    if (!snapshot.hasWorkshop) return ONBOARDING_CONTENT.refine_and_workshop;
    if (!snapshot.hasChestTier3OrHigher) return ONBOARDING_CONTENT.craft_t3_chest;
  }

  if (snapshot.enchantmentResearchState === "locked" && !snapshot.hasReachedFrostpeak) {
    return ONBOARDING_CONTENT.blue_progression;
  }

  if (snapshot.enchantmentResearchState !== "completed") {
    return ONBOARDING_CONTENT.enchantment_research;
  }

  if (!snapshot.hasReachedFrostpeak) return ONBOARDING_CONTENT.reach_frostpeak;
  if (snapshot.relicState === "unobtained") return ONBOARDING_CONTENT.discover_relic;

  if (snapshot.relicResearchState !== "completed") {
    return ONBOARDING_CONTENT.research_relic;
  }

  if (snapshot.sanctuaryResearchState !== "completed" || !snapshot.dungeonUnlocked) {
    return ONBOARDING_CONTENT.unlock_dungeons;
  }

  if (!snapshot.hasClearedT4Dungeon) {
    return snapshot.hasActiveDungeon
      ? ONBOARDING_CONTENT.clear_t4_dungeon
      : ONBOARDING_CONTENT.enter_t4_dungeon;
  }

  if (snapshot.terminalStage === "artifacts") return ONBOARDING_CONTENT.introduce_artifacts;
  if (snapshot.terminalStage === "artifact_weapons") return ONBOARDING_CONTENT.introduce_artifact_weapons;
  return null;
}

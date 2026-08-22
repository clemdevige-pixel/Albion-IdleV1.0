import { describe, expect, it } from "vitest";
import { resolveDungeonAccessState } from "./DungeonNavigationActions.js";

const AVAILABLE_FACTS = {
  definitionTier: 4,
  researchUnlocked: true,
  progressionUnlocked: true,
  hasWeapon: true,
  highestEquippedTier: 4,
  hasKey: true,
} as const;

describe("resolveDungeonAccessState", () => {
  it("uses the shared access priority for Research, progression, equipment, weapon and key gates", () => {
    expect(resolveDungeonAccessState({ ...AVAILABLE_FACTS, researchUnlocked: false })).toEqual({
      canEnter: false,
      reason: "research_locked",
    });
    expect(resolveDungeonAccessState({ ...AVAILABLE_FACTS, progressionUnlocked: false })).toEqual({
      canEnter: false,
      reason: "progression_locked",
      previousTier: 3,
    });
    expect(resolveDungeonAccessState({ ...AVAILABLE_FACTS, highestEquippedTier: 5 })).toEqual({
      canEnter: false,
      reason: "equipment_tier_locked",
      highestEquippedTier: 5,
    });
    expect(resolveDungeonAccessState({ ...AVAILABLE_FACTS, hasWeapon: false })).toEqual({
      canEnter: false,
      reason: "weapon_required",
    });
    expect(resolveDungeonAccessState({ ...AVAILABLE_FACTS, hasKey: false })).toEqual({
      canEnter: false,
      reason: "missing_key",
    });
    expect(resolveDungeonAccessState(AVAILABLE_FACTS)).toEqual({
      canEnter: true,
      reason: "available",
    });
  });

  it("fails closed for an unknown dungeon definition", () => {
    expect(resolveDungeonAccessState({
      researchUnlocked: true,
      progressionUnlocked: true,
      hasWeapon: true,
      hasKey: true,
    })).toEqual({
      canEnter: false,
      reason: "invalid_definition",
    });
  });
});

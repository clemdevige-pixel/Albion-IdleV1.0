import { describe, expect, it } from "vitest";
import { resolveTowerAccessState } from "./TowerNavigationActions.js";

describe("resolveTowerAccessState", () => {
  it("accepts matching or lower-tier equipment", () => {
    expect(resolveTowerAccessState({
      requiredTier: 6,
      researchUnlocked: true,
      activityAvailable: true,
      hasWeapon: true,
      highestEquippedTier: 6,
    })).toEqual({
      canEnter: true,
      reason: "available",
      requiredTier: 6,
      highestEquippedTier: 6,
    });

    expect(resolveTowerAccessState({
      requiredTier: 6,
      researchUnlocked: true,
      activityAvailable: true,
      hasWeapon: true,
      highestEquippedTier: 5,
    }).canEnter).toBe(true);
  });

  it("re-evaluates the authored tier cap when the next block is lower tier", () => {
    expect(resolveTowerAccessState({
      requiredTier: 8,
      researchUnlocked: true,
      activityAvailable: true,
      hasWeapon: true,
      highestEquippedTier: 8,
    }).canEnter).toBe(true);

    expect(resolveTowerAccessState({
      requiredTier: 6,
      researchUnlocked: true,
      activityAvailable: true,
      hasWeapon: true,
      highestEquippedTier: 8,
    })).toEqual({
      canEnter: false,
      reason: "equipment_tier_locked",
      requiredTier: 6,
      highestEquippedTier: 8,
    });
  });

  it("applies the same cap when revisiting a historical checkpoint", () => {
    expect(resolveTowerAccessState({
      requiredTier: 4,
      researchUnlocked: true,
      activityAvailable: true,
      hasWeapon: true,
      highestEquippedTier: 7,
    })).toEqual({
      canEnter: false,
      reason: "equipment_tier_locked",
      requiredTier: 4,
      highestEquippedTier: 7,
    });
  });

  it("preserves research, activity and weapon gates before tier validation", () => {
    expect(resolveTowerAccessState({
      requiredTier: 8,
      researchUnlocked: false,
      activityAvailable: true,
      hasWeapon: true,
      highestEquippedTier: 8,
    }).reason).toBe("research_locked");

    expect(resolveTowerAccessState({
      requiredTier: 8,
      researchUnlocked: true,
      activityAvailable: false,
      hasWeapon: true,
      highestEquippedTier: 8,
    }).reason).toBe("activity_busy");

    expect(resolveTowerAccessState({
      requiredTier: 8,
      researchUnlocked: true,
      activityAvailable: true,
      hasWeapon: false,
    }).reason).toBe("weapon_required");
  });
});

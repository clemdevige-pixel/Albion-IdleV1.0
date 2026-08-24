import { describe, expect, it } from "vitest";
import {
  CONTINUOUS_COMBAT_FLOW_POLICY,
  WORLD_COMBAT_FLOW_POLICY,
} from "./CombatFlowPolicy.js";

describe("CombatFlowPolicy", () => {
  it("keeps world HP continuous inside a segment, including the elite or boss", () => {
    expect(WORLD_COMBAT_FLOW_POLICY.shouldRestoreHeroHealthBeforeEncounter({
      locationChangedAfterVictory: false,
      enteringBoss: false,
    })).toBe(false);
    expect(WORLD_COMBAT_FLOW_POLICY.shouldRestoreHeroHealthBeforeEncounter({
      locationChangedAfterVictory: false,
      enteringBoss: true,
    })).toBe(false);
    expect(WORLD_COMBAT_FLOW_POLICY.shouldRestoreHeroHealthBeforeEncounter({
      locationChangedAfterVictory: true,
      enteringBoss: false,
    })).toBe(true);
    expect(WORLD_COMBAT_FLOW_POLICY.shouldRestoreHeroHealthBeforeEncounter({
      locationChangedAfterVictory: true,
      enteringBoss: true,
    })).toBe(true);
  });

  it("preserves current World segment cooldown reset", () => {
    expect(WORLD_COMBAT_FLOW_POLICY.shouldResetHeroCooldownsOnEncounterStart({ encounterIndex: 0 })).toBe(true);
    expect(WORLD_COMBAT_FLOW_POLICY.shouldResetHeroCooldownsOnEncounterStart({ encounterIndex: 1 })).toBe(false);
  });

  it("keeps dungeon HP continuous and resets cooldowns only when the dungeon starts", () => {
    expect(CONTINUOUS_COMBAT_FLOW_POLICY.shouldRestoreHeroHealthBeforeEncounter({
      locationChangedAfterVictory: true,
      enteringBoss: true,
    })).toBe(false);
    expect(CONTINUOUS_COMBAT_FLOW_POLICY.shouldResetHeroCooldownsOnEncounterStart({ encounterIndex: 0 })).toBe(true);
    expect(CONTINUOUS_COMBAT_FLOW_POLICY.shouldResetHeroCooldownsOnEncounterStart({ encounterIndex: 1 })).toBe(false);
    expect(CONTINUOUS_COMBAT_FLOW_POLICY.shouldResetHeroCooldownsOnEncounterStart({ encounterIndex: 4 })).toBe(false);
  });
});

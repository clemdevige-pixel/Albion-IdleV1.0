import { describe, expect, it } from "vitest";
import {
  WORLD_PROGRESSION_CONTRACT,
  WORLD_TIER_TRANSITION_CONTRACTS,
} from "../config/world-progression-contract.js";

describe("world progression contract", () => {
  it("keeps one transition plateau and one final gate for T5-T7", () => {
    for (const tier of [5, 6, 7] as const) {
      const roles = WORLD_PROGRESSION_CONTRACT[tier].zones.map((zone) => zone.role);
      expect(roles).toEqual([
        "transition_plateau",
        "progression",
        "progression",
        "progression",
        "final_gate",
      ]);
    }
  });

  it("keeps T8 Blackspire explicit as endgame instead of a fake tier transition", () => {
    expect(WORLD_PROGRESSION_CONTRACT[8].zones.map((zone) => zone.role)).toEqual([
      "transition_plateau",
      "progression",
      "progression",
      "progression",
      "endgame",
    ]);
  });

  it("keeps every authored tier transition on the same .2 fail / .3 pass contract", () => {
    for (const tier of [4, 5, 6, 7] as const) {
      const transition = WORLD_TIER_TRANSITION_CONTRACTS[tier];
      expect(transition.finalZoneIndex).toBe(4);
      expect(transition.nextTierFirstZoneIndex).toBe(0);
      expect(transition.blockedEnchantment).toBe(2);
      expect(transition.requiredEnchantment).toBe(3);
      expect(transition.plateauMinSegments).toBe(3);
      expect(transition.plateauMaxSegmentWithPotion).toBe(9);
    }
  });
});

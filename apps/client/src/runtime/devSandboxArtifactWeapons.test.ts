import { describe, expect, it } from "vitest";
import { FACTION_ARTIFACT_WEAPON_CONTENT } from "../data/factionArtifactWeaponContent.js";
import { getItemTier } from "../data/itemPower.js";
import { DEV_SANDBOX_ARTIFACT_WEAPON_T4_ITEM_IDS } from "./devSandbox.js";

describe("dev sandbox artifact weapon roster", () => {
  it("seeds exactly one T4.0 item id for every authored artifact specialization", () => {
    expect(DEV_SANDBOX_ARTIFACT_WEAPON_T4_ITEM_IDS).toHaveLength(
      FACTION_ARTIFACT_WEAPON_CONTENT.length,
    );
    expect(new Set(DEV_SANDBOX_ARTIFACT_WEAPON_T4_ITEM_IDS).size).toBe(
      DEV_SANDBOX_ARTIFACT_WEAPON_T4_ITEM_IDS.length,
    );

    for (const specialization of FACTION_ARTIFACT_WEAPON_CONTENT) {
      const expectedTier4 = specialization.items.find((item) => item.tier === 4)?.itemId;
      expect(expectedTier4, specialization.specializationMasteryId).toBeDefined();
      expect(DEV_SANDBOX_ARTIFACT_WEAPON_T4_ITEM_IDS).toContain(expectedTier4);
    }

    for (const itemId of DEV_SANDBOX_ARTIFACT_WEAPON_T4_ITEM_IDS) {
      expect(getItemTier(itemId), itemId).toBe(4);
    }
  });
});

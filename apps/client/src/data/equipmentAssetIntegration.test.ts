import { describe, expect, it } from "vitest";
import { FACTION_CAPE_CONTENT } from "./factionCapeContentCatalog.js";
import { PROGRESSION_EQUIPMENT_CONTENT } from "./nonWeaponEquipmentContentCatalog.js";
import { PROGRESSION_NON_WEAPON_VISUALS } from "./itemVisualContentCatalog.js";

const EXPECTED_EQUIPMENT_ICONS: Readonly<Record<string, string>> = {
  reinforced_helmet: "item-iron-helmet-pixel-v2.png",
  leather_armor: "item-leather-armor-pixel-v2.png",
  leather_boots: "item-leather-boots-pixel-v2.png",
};

const EXPECTED_CAPE_ICONS: Readonly<Record<string, string>> = {
  keeper: "CAPE_KEEPER.png",
  heretic: "CAPE_HERETIC.png",
  undead: "CAPE_UNDEAD.png",
  morgana: "CAPE_MORGANA.png",
};

describe("equipment asset integration", () => {
  it("uses the replacement helmet, armor and boots assets across tiers", () => {
    for (const family of PROGRESSION_EQUIPMENT_CONTENT) {
      const expectedIcon = EXPECTED_EQUIPMENT_ICONS[family.familyId];
      if (expectedIcon === undefined) continue;
      for (const item of family.items) {
        expect(PROGRESSION_NON_WEAPON_VISUALS[item.itemId]?.icon)
          .toBe(expectedIcon);
      }
    }
  });

  it("uses one authored icon for every faction cape tier", () => {
    for (const cape of FACTION_CAPE_CONTENT) {
      expect(PROGRESSION_NON_WEAPON_VISUALS[cape.itemId]).toMatchObject({
        name: cape.name,
        icon: EXPECTED_CAPE_ICONS[cape.factionId],
        tier: cape.tier,
        slot: "cape",
      });
    }
  });
});

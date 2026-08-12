import { describe, expect, it } from "vitest";
import {
  WEAPON_ITEM_DEFINITIONS,
  resolveWeaponMastery,
  resolveWeaponTier,
} from "../data/weaponContentCatalog.js";
import { resolveEquipmentInfo } from "../data/itemContentCatalog.js";
import { getItemDefinition } from "./ItemVisual.js";

const WEAPON_IDS = [
  "item_weapon_sword_t3_broadsword",
  "item_weapon_sword_t4_broadsword",
  "item_weapon_bow_t3_longbow",
  "item_weapon_bow_t4_longbow",
  "item_weapon_bow_t4_badon",
  "item_weapon_staff_t3_infernal",
  "item_weapon_staff_t4_infernal",
  "item_weapon_gloves_t3_spiked_gauntlets",
  "item_weapon_gloves_t4_spiked_gauntlets",
] as const;

describe("ItemVisual weapon derivation", () => {
  it.each(WEAPON_IDS)("derives gameplay metadata for %s from weaponContentCatalog", (itemId) => {
    const visual = getItemDefinition(itemId);
    const equipment = WEAPON_ITEM_DEFINITIONS[itemId];
    const resolvedEquipment = resolveEquipmentInfo(itemId);
    const tier = resolveWeaponTier(itemId);
    const mastery = resolveWeaponMastery(itemId);

    expect(visual).toBeDefined();
    expect(equipment).toBeDefined();
    expect(resolvedEquipment).toBeDefined();
    expect(tier).toBeDefined();
    expect(mastery).toBeDefined();

    expect(visual?.slot).toBe("weapon");
    expect(visual?.tier).toBe(tier);
    expect(visual?.handling).toBe(equipment?.handling);
    expect(visual?.stats).toEqual(resolvedEquipment?.stats);
    expect(visual?.name.endsWith(`T${String(tier)}`)).toBe(true);
    expect(visual?.icon.length).toBeGreaterThan(0);
  });

  it("does not infer unknown weapon visuals from an item-id naming pattern", () => {
    expect(getItemDefinition("item_weapon_sword_t4_not_real")).toBeUndefined();
  });
});

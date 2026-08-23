import { describe, expect, it } from "vitest";
import { FACTION_CAPE_CONTENT } from "./factionCapeContentCatalog.js";
import { PROGRESSION_EQUIPMENT_CONTENT } from "./nonWeaponEquipmentContentCatalog.js";
import {
  ENCHANTMENT_ITEM_POLICY,
  isAwakeningEligibleWeapon,
  resolveAuthoredEnchantmentItemInfo,
} from "./enchantmentItemPolicy.js";

describe("awakening enchantment policy", () => {
  it("uses the authored .4 policy as the single Awakening eligibility gate", () => {
    expect(isAwakeningEligibleWeapon("item_weapon_sword_t4_broadsword")).toBe(true);
    expect(isAwakeningEligibleWeapon("item_weapon_bow_t4_longbow")).toBe(true);
    expect(isAwakeningEligibleWeapon("item_weapon_bow_t4_badon")).toBe(true);

    expect(isAwakeningEligibleWeapon("item_shield_t4_reinforced")).toBe(false);
    expect(isAwakeningEligibleWeapon("item_armor_t4_leather")).toBe(false);
    expect(isAwakeningEligibleWeapon("item_unknown")).toBe(false);
  });

  it("keeps every conventional T4-T8 progression equipment item enchantable through .3", () => {
    for (const family of PROGRESSION_EQUIPMENT_CONTENT) {
      for (const item of family.items) {
        if (item.tier < 4 || item.tier > 8) continue;

        expect(ENCHANTMENT_ITEM_POLICY[item.itemId]).toEqual({
          enabled: true,
          maximumLevel: 3,
        });

        const resolved = resolveAuthoredEnchantmentItemInfo(item.itemId);
        expect(resolved?.enchantable).toBe(true);
        expect(resolved?.maximumLevel).toBe(3);
      }
    }
  });

  it("derives every faction cape as enchantable through .3 from faction cape content", () => {
    for (const cape of FACTION_CAPE_CONTENT) {
      expect(ENCHANTMENT_ITEM_POLICY[cape.itemId]).toEqual({
        enabled: true,
        maximumLevel: 3,
      });

      const resolved = resolveAuthoredEnchantmentItemInfo(cape.itemId);
      expect(resolved?.enchantable).toBe(true);
      expect(resolved?.maximumLevel).toBe(3);
    }
  });

  it("keeps Awakening reserved to authored weapons", () => {
    expect(resolveAuthoredEnchantmentItemInfo("item_shield_t8_reinforced")?.maximumLevel).toBe(3);
    expect(resolveAuthoredEnchantmentItemInfo("item_armor_t8_leather")?.maximumLevel).toBe(3);
    expect(resolveAuthoredEnchantmentItemInfo("item_cape_t8_keeper")?.maximumLevel).toBe(3);
    expect(resolveAuthoredEnchantmentItemInfo("item_weapon_sword_t8_broadsword")?.maximumLevel).toBe(4);
  });
});

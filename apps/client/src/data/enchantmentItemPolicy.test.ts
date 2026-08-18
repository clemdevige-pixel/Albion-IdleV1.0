import { describe, expect, it } from "vitest";
import {
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

  it("keeps conventional equipment capped below .4", () => {
    expect(resolveAuthoredEnchantmentItemInfo("item_shield_t4_reinforced")?.maximumLevel).toBe(3);
    expect(resolveAuthoredEnchantmentItemInfo("item_armor_t4_leather")?.maximumLevel).toBe(3);
    expect(resolveAuthoredEnchantmentItemInfo("item_weapon_sword_t4_broadsword")?.maximumLevel).toBe(4);
  });
});

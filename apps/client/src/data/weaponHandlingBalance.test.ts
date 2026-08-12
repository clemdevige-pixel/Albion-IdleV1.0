import { describe, expect, it } from "vitest";
import { resolveEquipmentInfo } from "./itemContentCatalog.js";
import { WEAPON_HANDLING_OFFENSIVE_MULTIPLIER } from "./weaponHandlingBalance.js";

describe("weapon handling balance", () => {
  it("keeps one-handed weapons at baseline and grants two-handed weapons a 25% offensive premium", () => {
    expect(WEAPON_HANDLING_OFFENSIVE_MULTIPLIER).toEqual({
      one_handed: 1,
      two_handed: 1.25,
    });

    const sword = resolveEquipmentInfo("item_weapon_sword_t4_broadsword")?.stats;
    const dagger = resolveEquipmentInfo("item_weapon_dagger_t4_pair")?.stats;
    const bow = resolveEquipmentInfo("item_weapon_bow_t4_longbow")?.stats;
    const staff = resolveEquipmentInfo("item_weapon_staff_t4_infernal")?.stats;
    const gloves = resolveEquipmentInfo("item_weapon_gloves_t4_spiked_gauntlets")?.stats;

    expect(sword?.stat_physical_damage).toBe(75);
    expect(dagger?.stat_physical_damage).toBe(72.5);
    expect(bow?.stat_physical_damage).toBe(106.25);
    expect(staff?.stat_magical_damage).toBe(112.5);
    expect(gloves?.stat_physical_damage).toBe(82.5);

    expect(sword?.stat_attack_speed).toBeCloseTo(0);
    expect(dagger?.stat_attack_speed).toBeCloseTo(0.4);
    expect(bow?.stat_attack_speed).toBeCloseTo(-0.2);
    expect(staff?.stat_attack_speed).toBeCloseTo(-0.3);
    expect(gloves?.stat_attack_speed).toBeCloseTo(0.2);
  });
});

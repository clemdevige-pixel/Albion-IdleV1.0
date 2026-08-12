import { describe, expect, it } from "vitest";
import { resolveEquipmentInfo } from "./itemContentCatalog.js";
import { WEAPON_HANDLING_OFFENSIVE_MULTIPLIER } from "./weaponHandlingBalance.js";

describe("weapon handling balance", () => {
  it("keeps one-handed weapons at baseline and grants two-handed weapons a 25% offensive premium", () => {
    expect(WEAPON_HANDLING_OFFENSIVE_MULTIPLIER).toEqual({
      one_handed: 1,
      two_handed: 1.25,
    });

    expect(resolveEquipmentInfo("item_weapon_sword_t4_broadsword")?.stats).toMatchObject({
      stat_physical_damage: 75,
      stat_attack_speed: 0,
    });
    expect(resolveEquipmentInfo("item_weapon_dagger_t4_pair")?.stats).toMatchObject({
      stat_physical_damage: 72.5,
      stat_attack_speed: 0.4,
    });
    expect(resolveEquipmentInfo("item_weapon_bow_t4_longbow")?.stats).toMatchObject({
      stat_physical_damage: 106.25,
      stat_attack_speed: -0.2,
    });
    expect(resolveEquipmentInfo("item_weapon_staff_t4_infernal")?.stats).toMatchObject({
      stat_magical_damage: 112.5,
      stat_attack_speed: -0.3,
    });
    expect(resolveEquipmentInfo("item_weapon_gloves_t4_spiked_gauntlets")?.stats).toMatchObject({
      stat_physical_damage: 82.5,
      stat_attack_speed: 0.2,
    });
  });
});

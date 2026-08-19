import { describe, expect, it } from "vitest";
import { resolveEquipmentInfo } from "./itemContentCatalog.js";
import { WEAPON_ITEM_DEFINITIONS } from "./weaponContentCatalog.js";

describe("weapon authored damage parity", () => {
  it("uses authored weapon damage directly without hidden handling multipliers", () => {
    for (const [itemId, authored] of Object.entries(WEAPON_ITEM_DEFINITIONS)) {
      const resolved = resolveEquipmentInfo(itemId);
      expect(resolved).toBeDefined();
      expect(resolved?.stats?.stat_physical_damage).toBe(authored.stats?.stat_physical_damage);
      expect(resolved?.stats?.stat_magical_damage).toBe(authored.stats?.stat_magical_damage);
    }
  });

  it("stores the former two-handed premium directly in the weapon data", () => {
    expect(WEAPON_ITEM_DEFINITIONS["item_weapon_bow_t3_longbow"]?.stats?.stat_physical_damage).toBe(70);
    expect(WEAPON_ITEM_DEFINITIONS["item_weapon_staff_t3_infernal"]?.stats?.stat_magical_damage).toBeCloseTo(67.2);
    expect(WEAPON_ITEM_DEFINITIONS["item_weapon_gloves_t3_spiked_gauntlets"]?.stats?.stat_physical_damage).toBeCloseTo(53.2);
    expect(WEAPON_ITEM_DEFINITIONS["item_weapon_dagger_t3_pair"]?.stats?.stat_physical_damage).toBeCloseTo(53.2);
  });
});

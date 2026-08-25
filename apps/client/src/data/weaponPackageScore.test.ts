import { describe, expect, it } from "vitest";
import { resolveEquipmentInfo } from "./itemContentCatalog.js";
import { T4_DEFENSIVE_LOADOUT, T4_SHIELD, type BenchmarkEnchantment } from "./weaponIdealBenchmark.js";
import { buildWeaponOnlyBenchmark, buildWeaponPackageBenchmark } from "./weaponPackageBenchmark.js";

const T4_WEAPONS = [
  "item_weapon_sword_t4_broadsword",
  "item_weapon_bow_t4_longbow",
  "item_weapon_staff_t4_infernal",
  "item_weapon_gloves_t4_spiked_gauntlets",
  "item_weapon_dagger_t4_pair",
] as const;

function referenceLoadout(itemId: string) {
  return resolveEquipmentInfo(itemId)?.handling === "one_handed"
    ? { armorItemIds: T4_DEFENSIVE_LOADOUT, offHandItemId: T4_SHIELD }
    : { armorItemIds: T4_DEFENSIVE_LOADOUT };
}

function buildCheckpoint(masteryLevel: number, enchantment: BenchmarkEnchantment) {
  return {
    weaponOnly: buildWeaponOnlyBenchmark(T4_WEAPONS, masteryLevel, enchantment),
    loadout: buildWeaponPackageBenchmark(T4_WEAPONS, masteryLevel, enchantment, referenceLoadout),
  };
}

describe("live weapon offensive/defensive package scoring", () => {
  it("scores the authored live weapon data after balance changes", () => {
    const t41 = buildCheckpoint(18, 1);
    const t42 = buildCheckpoint(22, 2);

    for (const result of [t41, t42]) {
      expect(result.weaponOnly).toHaveLength(5);
      expect(result.loadout).toHaveLength(5);
      expect(result.loadout.every((row) => Number.isFinite(row.packageScore))).toBe(true);
    }
  });
});

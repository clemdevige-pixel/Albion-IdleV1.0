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

function shortName(itemId: string): string {
  return itemId.replace("item_weapon_", "").replace("_t4_", " ");
}

function neutralLoadout() {
  return { armorItemIds: T4_DEFENSIVE_LOADOUT } as const;
}

function referenceLoadout(itemId: string) {
  return resolveEquipmentInfo(itemId)?.handling === "one_handed"
    ? { armorItemIds: T4_DEFENSIVE_LOADOUT, offHandItemId: T4_SHIELD }
    : { armorItemIds: T4_DEFENSIVE_LOADOUT };
}

function printCheckpoint(label: string, masteryLevel: number, enchantment: BenchmarkEnchantment) {
  const weaponOnly = buildWeaponOnlyBenchmark(T4_WEAPONS, masteryLevel, enchantment);
  const neutral = buildWeaponPackageBenchmark(T4_WEAPONS, masteryLevel, enchantment, neutralLoadout);
  const loadout = buildWeaponPackageBenchmark(T4_WEAPONS, masteryLevel, enchantment, referenceLoadout);

  console.log(`[WEAPON_ONLY_SCORE_${label}]`);
  console.table(weaponOnly.map((row) => ({ ...row, weapon: shortName(row.itemId) })));
  console.log(`[WEAPON_NEUTRAL_PACKAGE_${label}]`);
  console.table(neutral.map((row) => ({ ...row, weapon: shortName(row.itemId) })));
  console.log(`[WEAPON_LOADOUT_SCORE_${label}]`);
  console.table(loadout.map((row) => ({ ...row, weapon: shortName(row.itemId) })));
  return { weaponOnly, neutral, loadout };
}

describe("weapon offensive/defensive package scoring", () => {
  it("separates weapon-only identity from weapon plus explicit off-hand loadout power", () => {
    const t41 = printCheckpoint("T4_1_M18", 18, 1);
    const t42 = printCheckpoint("T4_2_M22", 22, 2);

    for (const result of [t41, t42]) {
      expect(result.weaponOnly).toHaveLength(5);
      expect(result.neutral).toHaveLength(5);
      expect(result.loadout).toHaveLength(5);
      expect(result.neutral.every((row) => row.defenseIndex === 100)).toBe(true);
      expect(result.loadout.every((row) => Number.isFinite(row.packageScore))).toBe(true);
    }
  });
});

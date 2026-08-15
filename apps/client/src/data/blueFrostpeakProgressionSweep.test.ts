import { describe, expect, it } from "vitest";
import { runBlueRuntimeBenchmark } from "../runtime/BlueRuntimeBenchmarkHarness.js";
import { resolveEquipmentInfo } from "./itemContentCatalog.js";
import { WORLD_ZONE_IDS } from "./worldContentCatalog.js";

const T4_WEAPONS = [
  "item_weapon_sword_t4_broadsword",
  "item_weapon_bow_t4_longbow",
  "item_weapon_staff_t4_infernal",
  "item_weapon_gloves_t4_spiked_gauntlets",
  "item_weapon_dagger_t4_pair",
] as const;
const T4_ARMOR = ["item_helmet_t4_reinforced", "item_armor_t4_leather", "item_boots_t4_leather", "item_traveler_cape"] as const;
const T4_SHIELD = "item_shield_t4_reinforced";

type Enchantment = 1 | 2 | 3;
type Checkpoint = {
  readonly id: string;
  readonly segmentIndex: number;
  readonly mastery: number;
  readonly enchantment: Enchantment;
  readonly useHealthPotions: boolean;
};

const CHECKPOINTS: readonly Checkpoint[] = [
  { id: "frostpeak_s1_full_t4_1", segmentIndex: 0, mastery: 18, enchantment: 1, useHealthPotions: false },
  { id: "frostpeak_s4_full_t4_1", segmentIndex: 3, mastery: 19, enchantment: 1, useHealthPotions: false },
  { id: "frostpeak_s6_full_t4_2", segmentIndex: 5, mastery: 20, enchantment: 2, useHealthPotions: false },
  { id: "frostpeak_s8_full_t4_2", segmentIndex: 7, mastery: 21, enchantment: 2, useHealthPotions: false },
  { id: "frostpeak_s10_full_t4_2", segmentIndex: 9, mastery: 22, enchantment: 2, useHealthPotions: false },
  { id: "frostpeak_s10_full_t4_3", segmentIndex: 9, mastery: 22, enchantment: 3, useHealthPotions: false },
  { id: "frostpeak_s10_full_t4_1_potion", segmentIndex: 9, mastery: 22, enchantment: 1, useHealthPotions: true },
];

function equipmentFor(weaponItemId: string): readonly string[] {
  const items: string[] = [...T4_ARMOR];
  if (resolveEquipmentInfo(weaponItemId)?.handling === "one_handed") items.push(T4_SHIELD);
  return items;
}

describe("Blue Frostpeak runtime progression sweep", () => {
  it("prints the T4.1-to-T4.2 final Blue progression probes", () => {
    const rows = CHECKPOINTS.flatMap((checkpoint) => T4_WEAPONS.map((weaponItemId) => {
      const result = runBlueRuntimeBenchmark({
        label: checkpoint.id,
        weaponItemId,
        zoneDefId: WORLD_ZONE_IDS.mountain,
        segmentIndex: checkpoint.segmentIndex,
        equipmentItemIds: equipmentFor(weaponItemId),
        masteryLevel: checkpoint.mastery,
        enchantment: checkpoint.enchantment,
        useHealthPotions: checkpoint.useHealthPotions,
      });
      return {
        checkpoint: checkpoint.id,
        weapon: weaponItemId.replace("item_weapon_", "").replace("_t4_", " "),
        clear: result.clear,
        hpPercent: result.hpPercent,
        potions: result.potionsUsed,
        encounters: result.encounterReached,
        hp: result.maxHealth,
        armor: result.armor,
        mr: result.magicResistance,
        mastery: result.masteryLevel,
        enchantment: checkpoint.enchantment,
      };
    }));

    console.table(rows);
    console.log("[BLUE_FROSTPEAK_RUNTIME_PROGRESSION_SWEEP]", JSON.stringify(rows, null, 2));
    expect(rows).toHaveLength(CHECKPOINTS.length * T4_WEAPONS.length);
    expect(rows.every((row) => Number.isFinite(row.hpPercent))).toBe(true);
    expect(rows.every((row) => row.encounters >= 1 && row.encounters <= 5)).toBe(true);
  });
});

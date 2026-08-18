import { describe, expect, it } from "vitest";
import { runCombatRuntimeBenchmark } from "../runtime/CombatRuntimeBenchmarkHarness.js";
import { resolveEquipmentInfo } from "./itemContentCatalog.js";
import { WORLD_ZONE_IDS } from "./worldContentCatalog.js";

const T4_WEAPONS = [
  "item_weapon_sword_t4_broadsword",
  "item_weapon_bow_t4_longbow",
  "item_weapon_bow_t4_badon",
  "item_weapon_staff_t4_infernal",
  "item_weapon_gloves_t4_spiked_gauntlets",
  "item_weapon_dagger_t4_pair",
] as const;

const T4_ARMOR = [
  "item_helmet_t4_reinforced",
  "item_armor_t4_leather",
  "item_boots_t4_leather",
  "item_traveler_cape",
] as const;
const T4_SHIELD = "item_shield_t4_reinforced";

type Enchantment = 1 | 2 | 3;
type Expectation = "diagnostic" | "all_clear" | "not_all_clear" | "profile_potion_ok";
type Checkpoint = {
  readonly id: string;
  readonly segmentIndex: number;
  readonly mastery: number;
  readonly enchantment: Enchantment;
  readonly useHealthPotions: boolean;
  readonly expectation: Expectation;
};

const CHECKPOINTS: readonly Checkpoint[] = [
  { id: "frostpeak_s1_full_t4_1", segmentIndex: 0, mastery: 18, enchantment: 1, useHealthPotions: false, expectation: "diagnostic" },
  { id: "frostpeak_s4_full_t4_1", segmentIndex: 3, mastery: 19, enchantment: 1, useHealthPotions: false, expectation: "profile_potion_ok" },
  { id: "frostpeak_s6_full_t4_2", segmentIndex: 5, mastery: 20, enchantment: 2, useHealthPotions: false, expectation: "diagnostic" },
  { id: "frostpeak_s8_full_t4_2", segmentIndex: 7, mastery: 21, enchantment: 2, useHealthPotions: false, expectation: "diagnostic" },
  { id: "frostpeak_s10_full_t4_2", segmentIndex: 9, mastery: 22, enchantment: 2, useHealthPotions: false, expectation: "not_all_clear" },
  { id: "frostpeak_s10_full_t4_2_potion", segmentIndex: 9, mastery: 22, enchantment: 2, useHealthPotions: true, expectation: "all_clear" },
  { id: "frostpeak_s10_full_t4_3", segmentIndex: 9, mastery: 22, enchantment: 3, useHealthPotions: false, expectation: "all_clear" },
  { id: "frostpeak_s10_full_t4_1_potion", segmentIndex: 9, mastery: 22, enchantment: 1, useHealthPotions: true, expectation: "not_all_clear" },
];

function shortWeaponName(itemId: string): string {
  return itemId.replace("item_weapon_", "").replace("_t4_", " ");
}

function equipmentFor(weaponItemId: string): readonly string[] {
  const items: string[] = [...T4_ARMOR];
  if (resolveEquipmentInfo(weaponItemId)?.handling === "one_handed") items.push(T4_SHIELD);
  return items;
}

function runCheckpoint(checkpoint: Checkpoint, weaponItemId: string, forcePotions?: boolean) {
  return runCombatRuntimeBenchmark({
    label: checkpoint.id,
    weaponItemId,
    zoneDefId: WORLD_ZONE_IDS.mountain,
    segmentIndex: checkpoint.segmentIndex,
    equipmentItemIds: equipmentFor(weaponItemId),
    masteryLevel: checkpoint.mastery,
    enchantment: checkpoint.enchantment,
    useHealthPotions: forcePotions ?? checkpoint.useHealthPotions,
  });
}

describe("Blue Frostpeak runtime progression sweep", () => {
  it("protects the role-aware potion progression contract", () => {
    const rows: Array<Record<string, unknown>> = [];

    for (const checkpoint of CHECKPOINTS) {
      const baseline = T4_WEAPONS.map((weaponItemId) => ({
        weaponItemId,
        result: runCheckpoint(checkpoint, weaponItemId),
      }));

      for (const { weaponItemId, result } of baseline) {
        rows.push({
          checkpoint: checkpoint.id,
          mode: checkpoint.useHealthPotions ? "required_potion" : "baseline",
          weapon: shortWeaponName(weaponItemId),
          clear: result.clear,
          hpPercent: result.hpPercent,
          potions: result.potionsUsed,
          encounters: result.encounterReached,
          hp: result.maxHealth,
          armor: result.armor,
          mr: result.magicResistance,
          mastery: result.masteryLevel,
          enchantment: checkpoint.enchantment,
        });
      }

      const clearCount = baseline.filter(({ result }) => result.clear).length;

      if (checkpoint.expectation === "all_clear") {
        expect(clearCount, checkpoint.id).toBe(T4_WEAPONS.length);
      } else if (checkpoint.expectation === "not_all_clear") {
        expect(clearCount, checkpoint.id).toBeLessThan(T4_WEAPONS.length);
      } else if (checkpoint.expectation === "profile_potion_ok") {
        const failed = baseline.filter(({ result }) => !result.clear);
        for (const { weaponItemId } of failed) {
          const fallback = runCheckpoint(checkpoint, weaponItemId, true);
          rows.push({
            checkpoint: checkpoint.id,
            mode: "profile_potion_fallback",
            weapon: shortWeaponName(weaponItemId),
            clear: fallback.clear,
            hpPercent: fallback.hpPercent,
            potions: fallback.potionsUsed,
            encounters: fallback.encounterReached,
            hp: fallback.maxHealth,
            armor: fallback.armor,
            mr: fallback.magicResistance,
            mastery: fallback.masteryLevel,
            enchantment: checkpoint.enchantment,
          });
          expect(fallback.clear, `${checkpoint.id} / ${shortWeaponName(weaponItemId)} potion fallback`).toBe(true);
        }
      }
    }

    console.table(rows);
    console.log("[BLUE_FROSTPEAK_RUNTIME_PROGRESSION_SWEEP]", JSON.stringify(rows, null, 2));

    expect(rows.every((row) => Number.isFinite(row.hpPercent))).toBe(true);
    expect(rows.every((row) => Number(row.encounters) >= 1 && Number(row.encounters) <= 5)).toBe(true);
  });
});

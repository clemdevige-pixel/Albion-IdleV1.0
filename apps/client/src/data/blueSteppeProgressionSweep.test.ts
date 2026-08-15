import { describe, expect, it } from "vitest";
import { runCombatRuntimeBenchmark } from "../runtime/CombatRuntimeBenchmarkHarness.js";
import { resolveEquipmentInfo } from "./itemContentCatalog.js";
import { WORLD_ZONE_IDS } from "./worldContentCatalog.js";

const T4_WEAPONS = ["item_weapon_sword_t4_broadsword", "item_weapon_bow_t4_longbow", "item_weapon_staff_t4_infernal", "item_weapon_gloves_t4_spiked_gauntlets", "item_weapon_dagger_t4_pair"] as const;
const T4_ARMOR = ["item_helmet_t4_reinforced", "item_armor_t4_leather", "item_boots_t4_leather", "item_traveler_cape"] as const;
const T4_SHIELD = "item_shield_t4_reinforced";
type Checkpoint = { readonly id: string; readonly segmentIndex: number; readonly mastery: number; readonly enchantment: 0 | 1; readonly useHealthPotions: boolean };
const CHECKPOINTS: readonly Checkpoint[] = [
  { id: "steppe_s1_full_t4_0", segmentIndex: 0, mastery: 14, enchantment: 0, useHealthPotions: false },
  { id: "steppe_s4_full_t4_0", segmentIndex: 3, mastery: 15, enchantment: 0, useHealthPotions: false },
  { id: "steppe_s6_full_t4_0", segmentIndex: 5, mastery: 16, enchantment: 0, useHealthPotions: false },
  { id: "steppe_s8_full_t4_1", segmentIndex: 7, mastery: 17, enchantment: 1, useHealthPotions: false },
  { id: "steppe_s10_full_t4_1", segmentIndex: 9, mastery: 18, enchantment: 1, useHealthPotions: false },
  { id: "steppe_s10_full_t4_0_potion", segmentIndex: 9, mastery: 18, enchantment: 0, useHealthPotions: true },
];
function equipmentFor(weaponItemId: string): readonly string[] { const items: string[] = [...T4_ARMOR]; if (resolveEquipmentInfo(weaponItemId)?.handling === "one_handed") items.push(T4_SHIELD); return items; }
describe("Blue Golden Steppe runtime progression sweep", () => {
  it("prints the T4.0-to-first-enchantment progression probes", () => {
    const rows = CHECKPOINTS.flatMap((checkpoint) => T4_WEAPONS.map((weaponItemId) => {
      const result = runCombatRuntimeBenchmark({ label: checkpoint.id, weaponItemId, zoneDefId: WORLD_ZONE_IDS.steppe, segmentIndex: checkpoint.segmentIndex, equipmentItemIds: equipmentFor(weaponItemId), masteryLevel: checkpoint.mastery, enchantment: checkpoint.enchantment, useHealthPotions: checkpoint.useHealthPotions });
      return { checkpoint: checkpoint.id, weapon: weaponItemId.replace("item_weapon_", "").replace("_t4_", " "), clear: result.clear, hpPercent: result.hpPercent, potions: result.potionsUsed, encounters: result.encounterReached, hp: result.maxHealth, armor: result.armor, mr: result.magicResistance, mastery: result.masteryLevel, enchantment: checkpoint.enchantment };
    }));
    console.table(rows); console.log("[BLUE_STEPPE_RUNTIME_PROGRESSION_SWEEP]", JSON.stringify(rows, null, 2));
    expect(rows).toHaveLength(CHECKPOINTS.length * T4_WEAPONS.length); expect(rows.every((row) => Number.isFinite(row.hpPercent))).toBe(true); expect(rows.every((row) => row.encounters >= 1 && row.encounters <= 5)).toBe(true);
  });
});

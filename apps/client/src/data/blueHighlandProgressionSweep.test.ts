import { describe, expect, it } from "vitest";
import { runCombatRuntimeBenchmark } from "../runtime/CombatRuntimeBenchmarkHarness.js";
import { resolveEquipmentInfo } from "./itemContentCatalog.js";
import { WORLD_ZONE_IDS } from "./worldContentCatalog.js";

const T3 = ["item_weapon_sword_t3_broadsword", "item_weapon_bow_t3_longbow", "item_weapon_staff_t3_infernal", "item_weapon_gloves_t3_spiked_gauntlets", "item_weapon_dagger_t3_pair"] as const;
const T4 = ["item_weapon_sword_t4_broadsword", "item_weapon_bow_t4_longbow", "item_weapon_staff_t4_infernal", "item_weapon_gloves_t4_spiked_gauntlets", "item_weapon_dagger_t4_pair"] as const;
const T3_ARMOR = ["item_iron_helmet", "item_leather_armor", "item_leather_boots", "item_traveler_cape"] as const;
const T4_ARMOR = ["item_helmet_t4_reinforced", "item_armor_t4_leather", "item_boots_t4_leather", "item_traveler_cape"] as const;
const T3_SHIELD = "item_shield_t3_reinforced";
const T4_SHIELD = "item_shield_t4_reinforced";

type Mode = "full_t3" | "t4_torso" | "t4_two_piece" | "full_t4";
type Checkpoint = { readonly id: string; readonly segmentIndex: number; readonly tier: 3 | 4; readonly mastery: number; readonly mode: Mode; readonly useHealthPotions?: boolean };
const CHECKPOINTS: readonly Checkpoint[] = [
  { id: "highland_s1_full_t3", segmentIndex: 0, tier: 3, mastery: 10, mode: "full_t3" },
  { id: "highland_s1_full_t3_potion", segmentIndex: 0, tier: 3, mastery: 10, mode: "full_t3", useHealthPotions: true },
  { id: "highland_s3_full_t3", segmentIndex: 2, tier: 3, mastery: 11, mode: "full_t3" },
  { id: "highland_s4_t4_torso", segmentIndex: 3, tier: 4, mastery: 11, mode: "t4_torso" },
  { id: "highland_s6_t4_two_piece", segmentIndex: 5, tier: 4, mastery: 12, mode: "t4_two_piece" },
  { id: "highland_s10_full_t4", segmentIndex: 9, tier: 4, mastery: 14, mode: "full_t4" },
];
function equipmentFor(itemId: string, checkpoint: Checkpoint): readonly string[] {
  if (checkpoint.mode === "full_t3") { const items: string[] = [...T3_ARMOR]; if (resolveEquipmentInfo(itemId)?.handling === "one_handed") items.push(T3_SHIELD); return items; }
  if (checkpoint.mode === "t4_torso") return ["item_armor_t4_leather", "item_iron_helmet", "item_leather_boots", "item_traveler_cape"];
  if (checkpoint.mode === "t4_two_piece") return ["item_armor_t4_leather", "item_helmet_t4_reinforced", "item_leather_boots", "item_traveler_cape"];
  const items: string[] = [...T4_ARMOR]; if (resolveEquipmentInfo(itemId)?.handling === "one_handed") items.push(T4_SHIELD); return items;
}
describe("Blue Highlands runtime progression sweep", () => {
  it("prints the T3-to-T4 transition probes", () => {
    const rows = CHECKPOINTS.flatMap((checkpoint) => (checkpoint.tier === 3 ? T3 : T4).map((weaponItemId) => {
      const result = runCombatRuntimeBenchmark({ label: checkpoint.id, weaponItemId, zoneDefId: WORLD_ZONE_IDS.highland, segmentIndex: checkpoint.segmentIndex, equipmentItemIds: equipmentFor(weaponItemId, checkpoint), masteryLevel: checkpoint.mastery, enchantment: 0, useHealthPotions: checkpoint.useHealthPotions ?? false });
      return { checkpoint: checkpoint.id, weapon: weaponItemId.replace("item_weapon_", "").replace("_t3_", " ").replace("_t4_", " "), clear: result.clear, hpPercent: result.hpPercent, potions: result.potionsUsed, encounters: result.encounterReached, hp: result.maxHealth, armor: result.armor, mr: result.magicResistance, mastery: result.masteryLevel };
    }));
    console.table(rows); console.log("[BLUE_HIGHLAND_RUNTIME_PROGRESSION_SWEEP]", JSON.stringify(rows, null, 2));
    expect(rows).toHaveLength(CHECKPOINTS.length * 5); expect(rows.every((row) => Number.isFinite(row.hpPercent))).toBe(true); expect(rows.every((row) => row.encounters >= 1 && row.encounters <= 5)).toBe(true);
  });
});

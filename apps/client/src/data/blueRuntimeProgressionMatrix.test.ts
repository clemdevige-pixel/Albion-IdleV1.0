import { describe, expect, it } from "vitest";
import { runBlueRuntimeBenchmark } from "../runtime/BlueRuntimeBenchmarkHarness.js";
import { resolveEquipmentInfo } from "./itemContentCatalog.js";
import { WORLD_ZONE_IDS } from "./worldContentCatalog.js";

const T3_WEAPONS = [
  "item_weapon_sword_t3_broadsword",
  "item_weapon_bow_t3_longbow",
  "item_weapon_staff_t3_infernal",
  "item_weapon_gloves_t3_spiked_gauntlets",
  "item_weapon_dagger_t3_pair",
] as const;
const T4_WEAPONS = [
  "item_weapon_sword_t4_broadsword",
  "item_weapon_bow_t4_longbow",
  "item_weapon_staff_t4_infernal",
  "item_weapon_gloves_t4_spiked_gauntlets",
  "item_weapon_dagger_t4_pair",
] as const;
const T3_ARMOR = ["item_iron_helmet", "item_leather_armor", "item_leather_boots", "item_traveler_cape"] as const;
const T4_ARMOR = ["item_helmet_t4_reinforced", "item_armor_t4_leather", "item_boots_t4_leather", "item_traveler_cape"] as const;
const T3_SHIELD = "item_shield_t3_reinforced";
const T4_SHIELD = "item_shield_t4_reinforced";

type Checkpoint = {
  readonly id: string;
  readonly zoneDefId: (typeof WORLD_ZONE_IDS)[keyof typeof WORLD_ZONE_IDS];
  readonly segmentIndex: number;
  readonly weaponTier: 3 | 4;
  readonly masteryLevel: number;
  readonly enchantment: 0 | 1 | 2 | 3;
  readonly armor: "none" | "torso_t3" | "full";
  readonly useHealthPotions: boolean;
};

const CHECKPOINTS: readonly Checkpoint[] = [
  { id: "forest_s10_starter", zoneDefId: WORLD_ZONE_IDS.forest, segmentIndex: 9, weaponTier: 3, masteryLevel: 1, enchantment: 0, armor: "none", useHealthPotions: false },
  { id: "swamp_s2_starter", zoneDefId: WORLD_ZONE_IDS.swamp, segmentIndex: 1, weaponTier: 3, masteryLevel: 1, enchantment: 0, armor: "none", useHealthPotions: false },
  { id: "swamp_s6_torso_t3", zoneDefId: WORLD_ZONE_IDS.swamp, segmentIndex: 5, weaponTier: 3, masteryLevel: 7, enchantment: 0, armor: "torso_t3", useHealthPotions: false },
  { id: "swamp_s10_full_t3", zoneDefId: WORLD_ZONE_IDS.swamp, segmentIndex: 9, weaponTier: 3, masteryLevel: 10, enchantment: 0, armor: "full", useHealthPotions: false },
  { id: "highland_s6_full_t3_potion", zoneDefId: WORLD_ZONE_IDS.highland, segmentIndex: 5, weaponTier: 3, masteryLevel: 10, enchantment: 0, armor: "full", useHealthPotions: true },
  { id: "highland_s6_t4_0", zoneDefId: WORLD_ZONE_IDS.highland, segmentIndex: 5, weaponTier: 4, masteryLevel: 10, enchantment: 0, armor: "full", useHealthPotions: false },
  { id: "steppe_s10_t4_0_potion", zoneDefId: WORLD_ZONE_IDS.steppe, segmentIndex: 9, weaponTier: 4, masteryLevel: 15, enchantment: 0, armor: "full", useHealthPotions: true },
  { id: "steppe_s10_t4_1", zoneDefId: WORLD_ZONE_IDS.steppe, segmentIndex: 9, weaponTier: 4, masteryLevel: 15, enchantment: 1, armor: "full", useHealthPotions: false },
  { id: "mountain_s10_t4_2_potion", zoneDefId: WORLD_ZONE_IDS.mountain, segmentIndex: 9, weaponTier: 4, masteryLevel: 20, enchantment: 2, armor: "full", useHealthPotions: true },
  { id: "mountain_s10_t4_3", zoneDefId: WORLD_ZONE_IDS.mountain, segmentIndex: 9, weaponTier: 4, masteryLevel: 20, enchantment: 3, armor: "full", useHealthPotions: false },
];

function shortWeaponName(itemId: string): string {
  return itemId.replace("item_weapon_", "").replace("_t3_", " ").replace("_t4_", " ");
}

function equipmentFor(weaponItemId: string, checkpoint: Checkpoint): readonly string[] {
  if (checkpoint.armor === "none") return [];
  if (checkpoint.armor === "torso_t3") return ["item_leather_armor"];
  const armor: string[] = checkpoint.weaponTier === 3 ? [...T3_ARMOR] : [...T4_ARMOR];
  if (resolveEquipmentInfo(weaponItemId)?.handling === "one_handed") {
    armor.push(checkpoint.weaponTier === 3 ? T3_SHIELD : T4_SHIELD);
  }
  return armor;
}

describe("Blue live runtime progression matrix", () => {
  it("prints every checkpoint through the exact live combat runtime", () => {
    const rows = CHECKPOINTS.flatMap((checkpoint) => {
      const weapons = checkpoint.weaponTier === 3 ? T3_WEAPONS : T4_WEAPONS;
      return weapons.map((weaponItemId) => {
        const result = runBlueRuntimeBenchmark({
          label: checkpoint.id,
          weaponItemId,
          zoneDefId: checkpoint.zoneDefId,
          segmentIndex: checkpoint.segmentIndex,
          equipmentItemIds: equipmentFor(weaponItemId, checkpoint),
          enchantment: checkpoint.enchantment,
          masteryLevel: checkpoint.masteryLevel,
          useHealthPotions: checkpoint.useHealthPotions,
        });
        return {
          checkpoint: checkpoint.id,
          weapon: shortWeaponName(weaponItemId),
          clear: result.clear,
          seconds: result.seconds,
          hpPercent: result.hpPercent,
          potions: result.potionsUsed,
          encounters: result.encounterReached,
          hp: result.maxHealth,
          armor: result.armor,
          mr: result.magicResistance,
          mastery: result.masteryLevel,
        };
      });
    });

    console.table(rows);
    console.log("[BLUE_LIVE_RUNTIME_PROGRESSION_MATRIX]", JSON.stringify(rows, null, 2));
    expect(rows).toHaveLength(CHECKPOINTS.length * 5);
    expect(rows.every((row) => Number.isFinite(row.seconds))).toBe(true);
    expect(rows.every((row) => row.encounters >= 1 && row.encounters <= 5)).toBe(true);
  });
});

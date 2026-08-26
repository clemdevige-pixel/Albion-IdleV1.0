import { describe, expect, it } from "vitest";
import { resolveEquipmentInfo } from "./itemContentCatalog.js";
import { KEEPER_T4_DUNGEON_ID } from "./dungeonContentCatalog.js";
import { WORLD_ZONE_IDS } from "./worldContentCatalog.js";
import { runCombatRuntimeBenchmark } from "../runtime/CombatRuntimeBenchmarkHarness.js";

const ENCHANTMENT = 3 as const;
const MASTERY_LEVEL = 40;
const MAX_POTIONS = 2;

const REFERENCE_WEAPONS = [
  "item_weapon_sword_t4_broadsword",
  "item_weapon_bow_t4_longbow",
  "item_weapon_staff_t4_infernal",
  "item_weapon_gloves_t4_spiked_gauntlets",
  "item_weapon_dagger_t4_pair",
] as const;

function keeperEquipment(weaponItemId: string): readonly string[] {
  const items: string[] = [
    "item_helmet_t4_reinforced",
    "item_armor_t4_leather",
    "item_boots_t4_leather",
    "item_cape_t4_keeper",
  ];
  if (resolveEquipmentInfo(weaponItemId)?.handling === "one_handed") {
    items.push("item_shield_t4_reinforced");
  }
  return items;
}

describe("Keeper T4 bootstrap regression", () => {
  it("keeps every reference family clearable in T4.3 with the Keeper cape and at most two potions", () => {
    const results = REFERENCE_WEAPONS.map((weaponItemId) => runCombatRuntimeBenchmark({
      label: `keeper_t4_bootstrap_${weaponItemId}`,
      weaponItemId,
      equipmentItemIds: keeperEquipment(weaponItemId),
      zoneDefId: WORLD_ZONE_IDS.mountain,
      segmentIndex: 9,
      dungeonDefinitionId: KEEPER_T4_DUNGEON_ID,
      enchantment: ENCHANTMENT,
      familyMasteryLevel: MASTERY_LEVEL,
      specializationMasteryLevel: MASTERY_LEVEL,
      siblingSpecializationMasteryLevel: 0,
      useHealthPotions: true,
    }));

    expect(results.filter((result) => result.clear)).toHaveLength(REFERENCE_WEAPONS.length);
    expect(results.every((result) => result.potionsUsed <= MAX_POTIONS)).toBe(true);
  });
});

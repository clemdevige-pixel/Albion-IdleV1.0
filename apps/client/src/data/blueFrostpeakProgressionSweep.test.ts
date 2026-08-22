import { describe, expect, it } from "vitest";
import { getWorldTierTransitionContract } from "@game/data";
import { runCombatRuntimeBenchmark } from "../runtime/CombatRuntimeBenchmarkHarness.js";
import { resolveEquipmentInfo } from "./itemContentCatalog.js";
import { WORLD_ZONE_IDS } from "./worldContentCatalog.js";

const T4_WEAPONS = [
  "item_weapon_sword_t4_broadsword",
  "item_weapon_bow_t4_longbow",
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

function equipmentFor(weaponItemId: string): readonly string[] {
  const items: string[] = [...T4_ARMOR];
  if (resolveEquipmentInfo(weaponItemId)?.handling === "one_handed") items.push(T4_SHIELD);
  return items;
}

describe("Blue Frostpeak runtime progression sweep", () => {
  it("protects the canonical T4.3 final boss gate contract", () => {
    const contract = getWorldTierTransitionContract(4);
    const blockedPotion = T4_WEAPONS.map((weaponItemId) => runCombatRuntimeBenchmark({
      label: "frostpeak_final_gate_blocked_potion",
      weaponItemId,
      zoneDefId: WORLD_ZONE_IDS.mountain,
      segmentIndex: 9,
      equipmentItemIds: equipmentFor(weaponItemId),
      masteryLevel: contract.masteryLevel,
      enchantment: contract.blockedEnchantment,
      useHealthPotions: true,
    }));
    const requiredNoPotion = T4_WEAPONS.map((weaponItemId) => runCombatRuntimeBenchmark({
      label: "frostpeak_final_gate_required_no_potion",
      weaponItemId,
      zoneDefId: WORLD_ZONE_IDS.mountain,
      segmentIndex: 9,
      equipmentItemIds: equipmentFor(weaponItemId),
      masteryLevel: contract.masteryLevel,
      enchantment: contract.requiredEnchantment,
      useHealthPotions: false,
    }));
    const requiredPotion = T4_WEAPONS.map((weaponItemId) => runCombatRuntimeBenchmark({
      label: "frostpeak_final_gate_required_potion",
      weaponItemId,
      zoneDefId: WORLD_ZONE_IDS.mountain,
      segmentIndex: 9,
      equipmentItemIds: equipmentFor(weaponItemId),
      masteryLevel: contract.masteryLevel,
      enchantment: contract.requiredEnchantment,
      useHealthPotions: true,
    }));

    expect(blockedPotion.filter((result) => result.clear)).toHaveLength(0);
    expect(requiredNoPotion.filter((result) => result.clear)).toHaveLength(0);
    expect(requiredPotion.filter((result) => result.clear)).toHaveLength(T4_WEAPONS.length);
  });
});

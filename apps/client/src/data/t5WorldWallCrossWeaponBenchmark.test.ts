import { describe, expect, it } from "vitest";
import { getWorldTierTransitionContract } from "@game/data";
import { runCombatRuntimeBenchmark } from "../runtime/CombatRuntimeBenchmarkHarness.js";
import { resolveEquipmentInfo } from "./itemContentCatalog.js";
import { WORLD_ZONE_IDS } from "./worldContentCatalog.js";

const TIER = 5 as const;
const DAGGER_PAIR_ID = "item_weapon_dagger_t5_pair";
const WEAPONS = [
  "item_weapon_sword_t5_broadsword",
  "item_weapon_bow_t5_longbow",
  "item_weapon_staff_t5_infernal",
  "item_weapon_gloves_t5_spiked_gauntlets",
  DAGGER_PAIR_ID,
] as const;

const ARMOR = [
  "item_helmet_t5_reinforced",
  "item_armor_t5_leather",
  "item_boots_t5_leather",
  "item_traveler_cape",
] as const;
const SHIELD = "item_shield_t5_reinforced";

function equipmentFor(weaponItemId: string): readonly string[] {
  const items: string[] = [...ARMOR];
  if (resolveEquipmentInfo(weaponItemId)?.handling === "one_handed") items.push(SHIELD);
  return items;
}

function shortName(weaponItemId: string): string {
  if (weaponItemId.includes("broadsword")) return "Broadsword";
  if (weaponItemId.includes("longbow")) return "Longbow";
  if (weaponItemId.includes("infernal")) return "Infernal Staff";
  if (weaponItemId.includes("spiked_gauntlets")) return "Spiked Gauntlets";
  if (weaponItemId.includes("dagger")) return "Dagger Pair";
  return weaponItemId;
}

describe("T5 world wall cross-weapon benchmark", () => {
  it("measures the canonical T5 wall across all progression weapons", () => {
    const contract = getWorldTierTransitionContract(TIER);
    const scenarios = [
      { name: ".2+potion", enchantment: contract.blockedEnchantment, useHealthPotions: true },
      { name: ".3-no-potion", enchantment: contract.requiredEnchantment, useHealthPotions: false },
      { name: ".3+potion", enchantment: contract.requiredEnchantment, useHealthPotions: true },
    ] as const;

    const rows = WEAPONS.flatMap((weaponItemId) => scenarios.map((scenario) => {
      const result = runCombatRuntimeBenchmark({
        label: `t5_wall_cross_weapon_${weaponItemId}_${scenario.name}`,
        weaponItemId,
        zoneDefId: WORLD_ZONE_IDS.ironveil,
        segmentIndex: 9,
        equipmentItemIds: equipmentFor(weaponItemId),
        masteryLevel: contract.masteryLevel,
        enchantment: scenario.enchantment,
        useHealthPotions: scenario.useHealthPotions,
      });
      return {
        weapon: shortName(weaponItemId),
        scenario: scenario.name,
        clear: result.clear,
        hpPct: result.hpPercent,
        bossProgressPct: result.bossProgressPercent,
        encounterProgressPct: result.encounterProgressPercent,
        potionsUsed: result.potionsUsed,
        damageDealt: Math.round(result.damageDealt),
        damageReceived: Math.round(result.damageReceived),
        observedDps: result.observedDps,
        incomingDps: result.incomingDps,
      };
    }));

    console.log("[T5_WORLD_WALL_CROSS_WEAPON]");
    console.table(rows);

    const required = rows.filter((row) => row.scenario === ".3+potion");
    console.log("[T5_WORLD_WALL_REQUIRED_ONLY]");
    console.table(required);

    const daggerRequiredResult = runCombatRuntimeBenchmark({
      label: "t5_wall_dagger_pair_required_breakdown",
      weaponItemId: DAGGER_PAIR_ID,
      zoneDefId: WORLD_ZONE_IDS.ironveil,
      segmentIndex: 9,
      equipmentItemIds: equipmentFor(DAGGER_PAIR_ID),
      masteryLevel: contract.masteryLevel,
      enchantment: contract.requiredEnchantment,
      useHealthPotions: true,
    });

    console.log("[T5_DAGGER_PAIR_DAMAGE_SOURCES]");
    console.table([{
      totalDamage: Math.round(daggerRequiredResult.damageDealt),
      autoAttack: Math.round(daggerRequiredResult.damageBySource.autoAttack),
      ability: Math.round(daggerRequiredResult.damageBySource.ability),
      effect: Math.round(daggerRequiredResult.damageBySource.effect),
      other: Math.round(daggerRequiredResult.damageBySource.other),
      observedDps: daggerRequiredResult.observedDps,
    }]);

    console.log("[T5_DAGGER_PAIR_ABILITY_BREAKDOWN]");
    console.table(daggerRequiredResult.abilities.map((ability) => ({
      abilityId: ability.abilityId,
      casts: ability.casts,
      directDamage: Math.round(ability.directDamage),
      dotDamage: Math.round(ability.dotDamage),
      totalDamage: Math.round(ability.totalDamage),
    })));

    const blocked = rows.filter((row) => row.scenario !== ".3+potion");
    expect(blocked.filter((row) => row.clear), "T5 blocked scenarios must remain blocked").toHaveLength(0);
  });
});

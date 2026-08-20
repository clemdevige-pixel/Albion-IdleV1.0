import { describe, expect, it } from "vitest";
import {
  ORANGE_WORLD_COMBAT_CURVE,
  RED_WORLD_COMBAT_CURVE,
  YELLOW_WORLD_COMBAT_CURVE,
  type ZoneCombatCurve,
} from "@game/data";
import { runCombatRuntimeBenchmark } from "../runtime/CombatRuntimeBenchmarkHarness.js";
import { resolveEquipmentInfo } from "./itemContentCatalog.js";
import { WORLD_ZONE_IDS } from "./worldContentCatalog.js";

const WEAPONS_BY_TIER = {
  5: [
    "item_weapon_sword_t5_broadsword",
    "item_weapon_bow_t5_longbow",
    "item_weapon_staff_t5_infernal",
    "item_weapon_gloves_t5_spiked_gauntlets",
    "item_weapon_dagger_t5_pair",
  ],
  6: [
    "item_weapon_sword_t6_broadsword",
    "item_weapon_bow_t6_longbow",
    "item_weapon_staff_t6_infernal",
    "item_weapon_gloves_t6_spiked_gauntlets",
    "item_weapon_dagger_t6_pair",
  ],
  7: [
    "item_weapon_sword_t7_broadsword",
    "item_weapon_bow_t7_longbow",
    "item_weapon_staff_t7_infernal",
    "item_weapon_gloves_t7_spiked_gauntlets",
    "item_weapon_dagger_t7_pair",
  ],
} as const;

const ARMOR_BY_TIER = {
  5: ["item_helmet_t5_reinforced", "item_armor_t5_leather", "item_boots_t5_leather", "item_traveler_cape"],
  6: ["item_helmet_t6_reinforced", "item_armor_t6_leather", "item_boots_t6_leather", "item_traveler_cape"],
  7: ["item_helmet_t7_reinforced", "item_armor_t7_leather", "item_boots_t7_leather", "item_traveler_cape"],
} as const;

const SHIELD_BY_TIER = {
  5: "item_shield_t5_reinforced",
  6: "item_shield_t6_reinforced",
  7: "item_shield_t7_reinforced",
} as const;

const TRANSITIONS = [
  {
    tier: 5,
    mastery: 35,
    zoneDefId: WORLD_ZONE_IDS.ironveil,
    curve: YELLOW_WORLD_COMBAT_CURVE,
    expectedGate: { healthMultiplier: 1.15, damageMultiplier: 1.325, defenseMultiplier: 1.05 },
  },
  {
    tier: 6,
    mastery: 45,
    zoneDefId: WORLD_ZONE_IDS.ashenpeak,
    curve: ORANGE_WORLD_COMBAT_CURVE,
    expectedGate: { healthMultiplier: 1, damageMultiplier: 1.375, defenseMultiplier: 1 },
  },
  {
    tier: 7,
    mastery: 55,
    zoneDefId: WORLD_ZONE_IDS.doompeak,
    curve: RED_WORLD_COMBAT_CURVE,
    expectedGate: { healthMultiplier: 1, damageMultiplier: 1.175, defenseMultiplier: 1 },
  },
] as const;

type Tier = keyof typeof WEAPONS_BY_TIER;

function equipmentFor(weaponItemId: string, tier: Tier): readonly string[] {
  const items: string[] = [...ARMOR_BY_TIER[tier]];
  if (resolveEquipmentInfo(weaponItemId)?.handling === "one_handed") items.push(SHIELD_BY_TIER[tier]);
  return items;
}

function getFinalBossGate(curve: readonly ZoneCombatCurve[]) {
  return curve[curve.length - 1]?.bossGate;
}

describe("validated later-tier boss gates", () => {
  it("keeps the T5 Broadsword correction authored at 120 base damage", () => {
    expect(resolveEquipmentInfo("item_weapon_sword_t5_broadsword")?.stats?.stat_physical_damage).toBe(120);
  });

  it("requires .3 plus potion at every T5-T8 tier transition", () => {
    for (const transition of TRANSITIONS) {
      const tier = transition.tier as Tier;
      const gate = getFinalBossGate(transition.curve);
      expect(gate).toMatchObject({ progressionRole: "boss_gate", ...transition.expectedGate });

      const tN2 = WEAPONS_BY_TIER[tier].map((weaponItemId) => runCombatRuntimeBenchmark({
        label: `boss_gate_regression_t${tier}_2`,
        weaponItemId,
        zoneDefId: transition.zoneDefId,
        segmentIndex: 9,
        equipmentItemIds: equipmentFor(weaponItemId, tier),
        masteryLevel: transition.mastery,
        enchantment: 2,
        useHealthPotions: true,
      }));
      const tN3 = WEAPONS_BY_TIER[tier].map((weaponItemId) => runCombatRuntimeBenchmark({
        label: `boss_gate_regression_t${tier}_3`,
        weaponItemId,
        zoneDefId: transition.zoneDefId,
        segmentIndex: 9,
        equipmentItemIds: equipmentFor(weaponItemId, tier),
        masteryLevel: transition.mastery,
        enchantment: 3,
        useHealthPotions: true,
      }));

      expect(tN2.filter((result) => result.clear)).toHaveLength(0);
      expect(tN3.filter((result) => result.clear)).toHaveLength(WEAPONS_BY_TIER[tier].length);
    }
  });
});

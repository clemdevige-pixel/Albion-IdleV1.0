import { describe, expect, it } from "vitest";
import { runCombatRuntimeBenchmark } from "../runtime/CombatRuntimeBenchmarkHarness.js";
import { resolveEquipmentInfo } from "./itemContentCatalog.js";
import { WORLD_ZONE_IDS } from "./worldContentCatalog.js";

const REPRESENTATIVE_WEAPONS = {
  4: [
    "item_weapon_sword_t4_broadsword",
    "item_weapon_bow_t4_longbow",
    "item_weapon_staff_t4_infernal",
    "item_weapon_gloves_t4_spiked_gauntlets",
    "item_weapon_dagger_t4_pair",
  ],
  5: [
    "item_weapon_sword_t5_broadsword",
    "item_weapon_bow_t5_longbow",
    "item_weapon_staff_t5_infernal",
    "item_weapon_gloves_t5_spiked_gauntlets",
    "item_weapon_dagger_t5_pair",
  ],
} as const;

const ARMOR_BY_TIER = {
  4: ["item_helmet_t4_reinforced", "item_armor_t4_leather", "item_boots_t4_leather", "item_traveler_cape"],
  5: ["item_helmet_t5_reinforced", "item_armor_t5_leather", "item_boots_t5_leather", "item_traveler_cape"],
} as const;

const SHIELD_BY_TIER = {
  4: "item_shield_t4_reinforced",
  5: "item_shield_t5_reinforced",
} as const;

type Tier = keyof typeof REPRESENTATIVE_WEAPONS;
type Enchantment = 0 | 1 | 2 | 3;
type YellowZoneKey = "amberwood" | "gloamfen" | "stormwatch" | "sunscar" | "ironveil";

type Checkpoint = {
  readonly id: string;
  readonly zone: YellowZoneKey;
  readonly segmentIndex: number;
  readonly tier: Tier;
  readonly mastery: number;
  readonly enchantment: Enchantment;
  readonly useHealthPotions: boolean;
};

/**
 * Diagnostic Yellow progression probes. These intentionally assert only harness
 * integrity until the first Yellow balance pass establishes the semantic
 * progression contract. Do not freeze the provisional curve as design law.
 */
const CHECKPOINTS: readonly Checkpoint[] = [
  { id: "amberwood_s1_full_t4_3", zone: "amberwood", segmentIndex: 0, tier: 4, mastery: 23, enchantment: 3, useHealthPotions: false },
  { id: "amberwood_s5_full_t4_3", zone: "amberwood", segmentIndex: 4, tier: 4, mastery: 24, enchantment: 3, useHealthPotions: false },
  { id: "amberwood_s10_full_t5_0", zone: "amberwood", segmentIndex: 9, tier: 5, mastery: 25, enchantment: 0, useHealthPotions: false },

  { id: "gloamfen_s1_full_t5_0", zone: "gloamfen", segmentIndex: 0, tier: 5, mastery: 25, enchantment: 0, useHealthPotions: false },
  { id: "gloamfen_s5_full_t5_0", zone: "gloamfen", segmentIndex: 4, tier: 5, mastery: 26, enchantment: 0, useHealthPotions: false },
  { id: "gloamfen_s10_full_t5_0", zone: "gloamfen", segmentIndex: 9, tier: 5, mastery: 27, enchantment: 0, useHealthPotions: false },

  { id: "stormwatch_s1_full_t5_0", zone: "stormwatch", segmentIndex: 0, tier: 5, mastery: 27, enchantment: 0, useHealthPotions: false },
  { id: "stormwatch_s5_full_t5_1", zone: "stormwatch", segmentIndex: 4, tier: 5, mastery: 28, enchantment: 1, useHealthPotions: false },
  { id: "stormwatch_s10_full_t5_1", zone: "stormwatch", segmentIndex: 9, tier: 5, mastery: 29, enchantment: 1, useHealthPotions: false },

  { id: "sunscar_s1_full_t5_1", zone: "sunscar", segmentIndex: 0, tier: 5, mastery: 30, enchantment: 1, useHealthPotions: false },
  { id: "sunscar_s5_full_t5_1", zone: "sunscar", segmentIndex: 4, tier: 5, mastery: 31, enchantment: 1, useHealthPotions: false },
  { id: "sunscar_s10_full_t5_2", zone: "sunscar", segmentIndex: 9, tier: 5, mastery: 32, enchantment: 2, useHealthPotions: false },

  { id: "ironveil_s1_full_t5_2", zone: "ironveil", segmentIndex: 0, tier: 5, mastery: 33, enchantment: 2, useHealthPotions: false },
  { id: "ironveil_s5_full_t5_2", zone: "ironveil", segmentIndex: 4, tier: 5, mastery: 34, enchantment: 2, useHealthPotions: false },
  { id: "ironveil_s10_full_t5_2", zone: "ironveil", segmentIndex: 9, tier: 5, mastery: 35, enchantment: 2, useHealthPotions: false },
  { id: "ironveil_s10_full_t5_3", zone: "ironveil", segmentIndex: 9, tier: 5, mastery: 35, enchantment: 3, useHealthPotions: false },
  { id: "ironveil_s10_full_t5_2_potion", zone: "ironveil", segmentIndex: 9, tier: 5, mastery: 35, enchantment: 2, useHealthPotions: true },
];

function equipmentFor(weaponItemId: string, tier: Tier): readonly string[] {
  const items: string[] = [...ARMOR_BY_TIER[tier]];
  if (resolveEquipmentInfo(weaponItemId)?.handling === "one_handed") items.push(SHIELD_BY_TIER[tier]);
  return items;
}

describe("Yellow T5 runtime progression sweep", () => {
  it("prints the first full Yellow T4.3-to-T5.3 progression probes", () => {
    const rows = CHECKPOINTS.flatMap((checkpoint) => REPRESENTATIVE_WEAPONS[checkpoint.tier].map((weaponItemId) => {
      const result = runCombatRuntimeBenchmark({
        label: checkpoint.id,
        weaponItemId,
        zoneDefId: WORLD_ZONE_IDS[checkpoint.zone],
        segmentIndex: checkpoint.segmentIndex,
        equipmentItemIds: equipmentFor(weaponItemId, checkpoint.tier),
        masteryLevel: checkpoint.mastery,
        enchantment: checkpoint.enchantment,
        useHealthPotions: checkpoint.useHealthPotions,
      });
      return {
        checkpoint: checkpoint.id,
        zone: checkpoint.zone,
        weapon: weaponItemId.replace("item_weapon_", "").replace(`_t${checkpoint.tier}_`, " "),
        clear: result.clear,
        hpPercent: result.hpPercent,
        potions: result.potionsUsed,
        encounters: result.encounterReached,
        hp: result.maxHealth,
        armor: result.armor,
        mr: result.magicResistance,
        mastery: result.masteryLevel,
        tier: checkpoint.tier,
        enchantment: checkpoint.enchantment,
      };
    }));

    console.table(rows);
    console.log("[YELLOW_T5_RUNTIME_PROGRESSION_SWEEP]", JSON.stringify(rows, null, 2));

    expect(rows).toHaveLength(CHECKPOINTS.length * 5);
    expect(rows.every((row) => Number.isFinite(row.hpPercent))).toBe(true);
    expect(rows.every((row) => row.encounters >= 1 && row.encounters <= 5)).toBe(true);
  });
});

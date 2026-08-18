import { describe, expect, it } from "vitest";
import { runCombatRuntimeBenchmark } from "../runtime/CombatRuntimeBenchmarkHarness.js";
import { resolveEquipmentInfo } from "./itemContentCatalog.js";
import { WORLD_ZONE_IDS } from "./worldContentCatalog.js";

const REPRESENTATIVE_WEAPONS = {
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
} as const;

const ARMOR_BY_TIER = {
  5: ["item_helmet_t5_reinforced", "item_armor_t5_leather", "item_boots_t5_leather", "item_traveler_cape"],
  6: ["item_helmet_t6_reinforced", "item_armor_t6_leather", "item_boots_t6_leather", "item_traveler_cape"],
} as const;

const SHIELD_BY_TIER = {
  5: "item_shield_t5_reinforced",
  6: "item_shield_t6_reinforced",
} as const;

type Tier = keyof typeof REPRESENTATIVE_WEAPONS;
type Enchantment = 0 | 1 | 2 | 3;
type OrangeZoneKey = "cinderwood" | "rotfen" | "thundercrag" | "emberwind" | "ashenpeak";

type Checkpoint = {
  readonly id: string;
  readonly zone: OrangeZoneKey;
  readonly segmentIndex: number;
  readonly tier: Tier;
  readonly mastery: number;
  readonly enchantment: Enchantment;
  readonly useHealthPotions: boolean;
};

/**
 * Diagnostic Orange progression probes.
 *
 * These intentionally assert only harness integrity. The semantic Orange
 * contract is calibrated from this output rather than freezing the provisional
 * combat curve or the first-pass T6 equipment stats as design law.
 */
const CHECKPOINTS: readonly Checkpoint[] = [
  { id: "cinderwood_s1_full_t5_3", zone: "cinderwood", segmentIndex: 0, tier: 5, mastery: 36, enchantment: 3, useHealthPotions: false },
  { id: "cinderwood_s5_full_t6_0", zone: "cinderwood", segmentIndex: 4, tier: 6, mastery: 37, enchantment: 0, useHealthPotions: false },
  { id: "cinderwood_s10_full_t6_0", zone: "cinderwood", segmentIndex: 9, tier: 6, mastery: 38, enchantment: 0, useHealthPotions: false },

  { id: "rotfen_s1_full_t6_0", zone: "rotfen", segmentIndex: 0, tier: 6, mastery: 38, enchantment: 0, useHealthPotions: false },
  { id: "rotfen_s5_full_t6_0", zone: "rotfen", segmentIndex: 4, tier: 6, mastery: 39, enchantment: 0, useHealthPotions: false },
  { id: "rotfen_s10_full_t6_1", zone: "rotfen", segmentIndex: 9, tier: 6, mastery: 40, enchantment: 1, useHealthPotions: false },

  { id: "thundercrag_s1_full_t6_1", zone: "thundercrag", segmentIndex: 0, tier: 6, mastery: 40, enchantment: 1, useHealthPotions: false },
  { id: "thundercrag_s5_full_t6_1", zone: "thundercrag", segmentIndex: 4, tier: 6, mastery: 41, enchantment: 1, useHealthPotions: false },
  { id: "thundercrag_s10_full_t6_2", zone: "thundercrag", segmentIndex: 9, tier: 6, mastery: 42, enchantment: 2, useHealthPotions: false },

  { id: "emberwind_s1_full_t6_2", zone: "emberwind", segmentIndex: 0, tier: 6, mastery: 42, enchantment: 2, useHealthPotions: false },
  { id: "emberwind_s5_full_t6_2", zone: "emberwind", segmentIndex: 4, tier: 6, mastery: 43, enchantment: 2, useHealthPotions: false },
  { id: "emberwind_s10_full_t6_3", zone: "emberwind", segmentIndex: 9, tier: 6, mastery: 44, enchantment: 3, useHealthPotions: false },

  { id: "ashenpeak_s1_full_t6_3", zone: "ashenpeak", segmentIndex: 0, tier: 6, mastery: 44, enchantment: 3, useHealthPotions: false },
  { id: "ashenpeak_s5_full_t6_3", zone: "ashenpeak", segmentIndex: 4, tier: 6, mastery: 45, enchantment: 3, useHealthPotions: false },
  { id: "ashenpeak_s10_full_t6_3", zone: "ashenpeak", segmentIndex: 9, tier: 6, mastery: 45, enchantment: 3, useHealthPotions: false },
  { id: "ashenpeak_s10_full_t6_3_potion", zone: "ashenpeak", segmentIndex: 9, tier: 6, mastery: 45, enchantment: 3, useHealthPotions: true },
];

function equipmentFor(weaponItemId: string, tier: Tier): readonly string[] {
  const items: string[] = [...ARMOR_BY_TIER[tier]];
  if (resolveEquipmentInfo(weaponItemId)?.handling === "one_handed") items.push(SHIELD_BY_TIER[tier]);
  return items;
}

describe("Orange T6 runtime progression sweep", () => {
  it("prints the first full Orange T5.3-to-T6.3 progression probes", () => {
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
    console.log("[ORANGE_T6_RUNTIME_PROGRESSION_SWEEP]", JSON.stringify(rows, null, 2));

    expect(rows).toHaveLength(CHECKPOINTS.length * 5);
    expect(rows.every((row) => Number.isFinite(row.hpPercent))).toBe(true);
    expect(rows.every((row) => row.encounters >= 1 && row.encounters <= 5)).toBe(true);
  });
});

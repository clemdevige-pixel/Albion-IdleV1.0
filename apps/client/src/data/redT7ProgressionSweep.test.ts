import { describe, expect, it } from "vitest";
import { runCombatRuntimeBenchmark } from "../runtime/CombatRuntimeBenchmarkHarness.js";
import { resolveEquipmentInfo } from "./itemContentCatalog.js";
import { WORLD_ZONE_IDS } from "./worldContentCatalog.js";

const REPRESENTATIVE_WEAPONS = {
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
  6: ["item_helmet_t6_reinforced", "item_armor_t6_leather", "item_boots_t6_leather", "item_traveler_cape"],
  7: ["item_helmet_t7_reinforced", "item_armor_t7_leather", "item_boots_t7_leather", "item_traveler_cape"],
} as const;

const SHIELD_BY_TIER = {
  6: "item_shield_t6_reinforced",
  7: "item_shield_t7_reinforced",
} as const;

type Tier = keyof typeof REPRESENTATIVE_WEAPONS;
type Enchantment = 0 | 1 | 2 | 3;
type RedZoneKey = "bloodwood" | "dreadfen" | "redspire" | "crimsonSteppe" | "doompeak";

type Checkpoint = {
  readonly id: string;
  readonly zone: RedZoneKey;
  readonly segmentIndex: number;
  readonly tier: Tier;
  readonly mastery: number;
  readonly enchantment: Enchantment;
  readonly useHealthPotions: boolean;
};

/**
 * Diagnostic Red progression probes.
 *
 * As for Orange, these assert harness integrity only. They expose the live
 * T6.3 -> T7.3 curve before any Red-specific balance values are frozen.
 */
const CHECKPOINTS: readonly Checkpoint[] = [
  { id: "bloodwood_s1_full_t6_3", zone: "bloodwood", segmentIndex: 0, tier: 6, mastery: 46, enchantment: 3, useHealthPotions: false },
  { id: "bloodwood_s5_full_t7_0", zone: "bloodwood", segmentIndex: 4, tier: 7, mastery: 47, enchantment: 0, useHealthPotions: false },
  { id: "bloodwood_s10_full_t7_0", zone: "bloodwood", segmentIndex: 9, tier: 7, mastery: 48, enchantment: 0, useHealthPotions: false },

  { id: "dreadfen_s1_full_t7_0", zone: "dreadfen", segmentIndex: 0, tier: 7, mastery: 48, enchantment: 0, useHealthPotions: false },
  { id: "dreadfen_s5_full_t7_0", zone: "dreadfen", segmentIndex: 4, tier: 7, mastery: 49, enchantment: 0, useHealthPotions: false },
  { id: "dreadfen_s10_full_t7_1", zone: "dreadfen", segmentIndex: 9, tier: 7, mastery: 50, enchantment: 1, useHealthPotions: false },

  { id: "redspire_s1_full_t7_1", zone: "redspire", segmentIndex: 0, tier: 7, mastery: 50, enchantment: 1, useHealthPotions: false },
  { id: "redspire_s5_full_t7_1", zone: "redspire", segmentIndex: 4, tier: 7, mastery: 51, enchantment: 1, useHealthPotions: false },
  { id: "redspire_s10_full_t7_2", zone: "redspire", segmentIndex: 9, tier: 7, mastery: 52, enchantment: 2, useHealthPotions: false },

  { id: "crimson_steppe_s1_full_t7_2", zone: "crimsonSteppe", segmentIndex: 0, tier: 7, mastery: 52, enchantment: 2, useHealthPotions: false },
  { id: "crimson_steppe_s5_full_t7_2", zone: "crimsonSteppe", segmentIndex: 4, tier: 7, mastery: 53, enchantment: 2, useHealthPotions: false },
  { id: "crimson_steppe_s10_full_t7_3", zone: "crimsonSteppe", segmentIndex: 9, tier: 7, mastery: 54, enchantment: 3, useHealthPotions: false },

  { id: "doompeak_s1_full_t7_3", zone: "doompeak", segmentIndex: 0, tier: 7, mastery: 54, enchantment: 3, useHealthPotions: false },
  { id: "doompeak_s5_full_t7_3", zone: "doompeak", segmentIndex: 4, tier: 7, mastery: 55, enchantment: 3, useHealthPotions: false },
  { id: "doompeak_s10_full_t7_3", zone: "doompeak", segmentIndex: 9, tier: 7, mastery: 55, enchantment: 3, useHealthPotions: false },
  { id: "doompeak_s10_full_t7_3_potion", zone: "doompeak", segmentIndex: 9, tier: 7, mastery: 55, enchantment: 3, useHealthPotions: true },
];

function equipmentFor(weaponItemId: string, tier: Tier): readonly string[] {
  const items: string[] = [...ARMOR_BY_TIER[tier]];
  if (resolveEquipmentInfo(weaponItemId)?.handling === "one_handed") items.push(SHIELD_BY_TIER[tier]);
  return items;
}

describe("Red T7 runtime progression sweep", () => {
  it("prints the first full Red T6.3-to-T7.3 progression probes", () => {
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
        seconds: result.seconds,
        damageDealt: result.damageDealt,
        damageReceived: result.damageReceived,
        observedDps: result.observedDps,
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
    console.log("[RED_T7_RUNTIME_PROGRESSION_SWEEP]", JSON.stringify(rows, null, 2));

    expect(rows).toHaveLength(CHECKPOINTS.length * 5);
    expect(rows.every((row) => Number.isFinite(row.hpPercent))).toBe(true);
    expect(rows.every((row) => Number.isFinite(row.damageDealt) && row.damageDealt >= 0)).toBe(true);
    expect(rows.every((row) => Number.isFinite(row.damageReceived) && row.damageReceived >= 0)).toBe(true);
    expect(rows.every((row) => Number.isFinite(row.observedDps) && row.observedDps >= 0)).toBe(true);
    expect(rows.every((row) => row.encounters >= 1 && row.encounters <= 5)).toBe(true);
  });
});

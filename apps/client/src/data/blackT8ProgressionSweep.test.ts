import { describe, expect, it } from "vitest";
import { runCombatRuntimeBenchmark } from "../runtime/CombatRuntimeBenchmarkHarness.js";
import { resolveEquipmentInfo } from "./itemContentCatalog.js";
import { WORLD_ZONE_IDS } from "./worldContentCatalog.js";

const REPRESENTATIVE_WEAPONS = {
  7: [
    "item_weapon_sword_t7_broadsword",
    "item_weapon_bow_t7_longbow",
    "item_weapon_staff_t7_infernal",
    "item_weapon_gloves_t7_spiked_gauntlets",
    "item_weapon_dagger_t7_pair",
  ],
  8: [
    "item_weapon_sword_t8_broadsword",
    "item_weapon_bow_t8_longbow",
    "item_weapon_staff_t8_infernal",
    "item_weapon_gloves_t8_spiked_gauntlets",
    "item_weapon_dagger_t8_pair",
  ],
} as const;

const ARMOR_BY_TIER = {
  7: ["item_helmet_t7_reinforced", "item_armor_t7_leather", "item_boots_t7_leather", "item_traveler_cape"],
  8: ["item_helmet_t8_reinforced", "item_armor_t8_leather", "item_boots_t8_leather", "item_traveler_cape"],
} as const;

const SHIELD_BY_TIER = {
  7: "item_shield_t7_reinforced",
  8: "item_shield_t8_reinforced",
} as const;

type Tier = keyof typeof REPRESENTATIVE_WEAPONS;
type Enchantment = 0 | 1 | 2 | 3;
type BlackZoneKey = "blackwood" | "shadowfen" | "obsidianHighlands" | "duskfallSteppe" | "blackspire";

type Checkpoint = {
  readonly id: string;
  readonly zone: BlackZoneKey;
  readonly segmentIndex: number;
  readonly tier: Tier;
  readonly mastery: number;
  readonly enchantment: Enchantment;
  readonly useHealthPotions: boolean;
};

/**
 * Diagnostic Black progression probes.
 *
 * These extend the same runtime-only progression matrix used by Orange and Red.
 * They deliberately assert harness integrity only; Black/T8 combat values remain
 * provisional until the complete T4-T8 balance pass.
 */
const CHECKPOINTS: readonly Checkpoint[] = [
  { id: "blackwood_s1_full_t7_3", zone: "blackwood", segmentIndex: 0, tier: 7, mastery: 56, enchantment: 3, useHealthPotions: false },
  { id: "blackwood_s5_full_t8_0", zone: "blackwood", segmentIndex: 4, tier: 8, mastery: 57, enchantment: 0, useHealthPotions: false },
  { id: "blackwood_s10_full_t8_0", zone: "blackwood", segmentIndex: 9, tier: 8, mastery: 58, enchantment: 0, useHealthPotions: false },

  { id: "shadowfen_s1_full_t8_0", zone: "shadowfen", segmentIndex: 0, tier: 8, mastery: 58, enchantment: 0, useHealthPotions: false },
  { id: "shadowfen_s5_full_t8_0", zone: "shadowfen", segmentIndex: 4, tier: 8, mastery: 59, enchantment: 0, useHealthPotions: false },
  { id: "shadowfen_s10_full_t8_1", zone: "shadowfen", segmentIndex: 9, tier: 8, mastery: 60, enchantment: 1, useHealthPotions: false },

  { id: "obsidian_highlands_s1_full_t8_1", zone: "obsidianHighlands", segmentIndex: 0, tier: 8, mastery: 60, enchantment: 1, useHealthPotions: false },
  { id: "obsidian_highlands_s5_full_t8_1", zone: "obsidianHighlands", segmentIndex: 4, tier: 8, mastery: 61, enchantment: 1, useHealthPotions: false },
  { id: "obsidian_highlands_s10_full_t8_2", zone: "obsidianHighlands", segmentIndex: 9, tier: 8, mastery: 62, enchantment: 2, useHealthPotions: false },

  { id: "duskfall_steppe_s1_full_t8_2", zone: "duskfallSteppe", segmentIndex: 0, tier: 8, mastery: 62, enchantment: 2, useHealthPotions: false },
  { id: "duskfall_steppe_s5_full_t8_2", zone: "duskfallSteppe", segmentIndex: 4, tier: 8, mastery: 63, enchantment: 2, useHealthPotions: false },
  { id: "duskfall_steppe_s10_full_t8_3", zone: "duskfallSteppe", segmentIndex: 9, tier: 8, mastery: 64, enchantment: 3, useHealthPotions: false },

  { id: "blackspire_s1_full_t8_3", zone: "blackspire", segmentIndex: 0, tier: 8, mastery: 64, enchantment: 3, useHealthPotions: false },
  { id: "blackspire_s5_full_t8_3", zone: "blackspire", segmentIndex: 4, tier: 8, mastery: 65, enchantment: 3, useHealthPotions: false },
  { id: "blackspire_s10_full_t8_3", zone: "blackspire", segmentIndex: 9, tier: 8, mastery: 65, enchantment: 3, useHealthPotions: false },
  { id: "blackspire_s10_full_t8_3_potion", zone: "blackspire", segmentIndex: 9, tier: 8, mastery: 65, enchantment: 3, useHealthPotions: true },
];

function equipmentFor(weaponItemId: string, tier: Tier): readonly string[] {
  const items: string[] = [...ARMOR_BY_TIER[tier]];
  if (resolveEquipmentInfo(weaponItemId)?.handling === "one_handed") items.push(SHIELD_BY_TIER[tier]);
  return items;
}

describe("Black T8 runtime progression sweep", () => {
  it("prints the first full Black T7.3-to-T8.3 progression probes", () => {
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
    console.log("[BLACK_T8_RUNTIME_PROGRESSION_SWEEP]", JSON.stringify(rows, null, 2));

    expect(rows).toHaveLength(CHECKPOINTS.length * 5);
    expect(rows.every((row) => Number.isFinite(row.hpPercent))).toBe(true);
    expect(rows.every((row) => Number.isFinite(row.damageDealt) && row.damageDealt >= 0)).toBe(true);
    expect(rows.every((row) => Number.isFinite(row.damageReceived) && row.damageReceived >= 0)).toBe(true);
    expect(rows.every((row) => Number.isFinite(row.observedDps) && row.observedDps >= 0)).toBe(true);
    expect(rows.every((row) => row.encounters >= 1 && row.encounters <= 5)).toBe(true);
  });
});

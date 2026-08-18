import { describe, expect, it } from "vitest";
import { getEncounterRewards } from "@game/gameplay";
import { runCombatRuntimeBenchmark } from "../runtime/CombatRuntimeBenchmarkHarness.js";
import { resolveEquipmentInfo } from "./itemContentCatalog.js";
import { WORLD_ZONE_IDS, getWorldZonePlacement, type WorldZoneKey } from "./worldContentCatalog.js";

const TIERS = [4, 5, 6, 7, 8] as const;
type Tier = (typeof TIERS)[number];

const WEAPONS_BY_TIER = {
  4: ["item_weapon_sword_t4_broadsword", "item_weapon_bow_t4_longbow", "item_weapon_staff_t4_infernal", "item_weapon_gloves_t4_spiked_gauntlets", "item_weapon_dagger_t4_pair"],
  5: ["item_weapon_sword_t5_broadsword", "item_weapon_bow_t5_longbow", "item_weapon_staff_t5_infernal", "item_weapon_gloves_t5_spiked_gauntlets", "item_weapon_dagger_t5_pair"],
  6: ["item_weapon_sword_t6_broadsword", "item_weapon_bow_t6_longbow", "item_weapon_staff_t6_infernal", "item_weapon_gloves_t6_spiked_gauntlets", "item_weapon_dagger_t6_pair"],
  7: ["item_weapon_sword_t7_broadsword", "item_weapon_bow_t7_longbow", "item_weapon_staff_t7_infernal", "item_weapon_gloves_t7_spiked_gauntlets", "item_weapon_dagger_t7_pair"],
  8: ["item_weapon_sword_t8_broadsword", "item_weapon_bow_t8_longbow", "item_weapon_staff_t8_infernal", "item_weapon_gloves_t8_spiked_gauntlets", "item_weapon_dagger_t8_pair"],
} as const;

const ARMOR_BY_TIER = {
  4: ["item_helmet_t4_reinforced", "item_armor_t4_leather", "item_boots_t4_leather", "item_traveler_cape"],
  5: ["item_helmet_t5_reinforced", "item_armor_t5_leather", "item_boots_t5_leather", "item_traveler_cape"],
  6: ["item_helmet_t6_reinforced", "item_armor_t6_leather", "item_boots_t6_leather", "item_traveler_cape"],
  7: ["item_helmet_t7_reinforced", "item_armor_t7_leather", "item_boots_t7_leather", "item_traveler_cape"],
  8: ["item_helmet_t8_reinforced", "item_armor_t8_leather", "item_boots_t8_leather", "item_traveler_cape"],
} as const;

const SHIELD_BY_TIER = {
  4: "item_shield_t4_reinforced",
  5: "item_shield_t5_reinforced",
  6: "item_shield_t6_reinforced",
  7: "item_shield_t7_reinforced",
  8: "item_shield_t8_reinforced",
} as const;

const FINAL_ZONE_BY_TIER = {
  4: "mountain",
  5: "ironveil",
  6: "ashenpeak",
  7: "doompeak",
  8: "blackspire",
} as const satisfies Readonly<Record<Tier, WorldZoneKey>>;

const MASTERY_BY_TIER = { 4: 20, 5: 35, 6: 45, 7: 55, 8: 65 } as const satisfies Readonly<Record<Tier, number>>;
const SEGMENT_CANDIDATES = [9, 4, 0] as const;

function equipmentFor(weaponItemId: string, tier: Tier): readonly string[] {
  const items: string[] = [...ARMOR_BY_TIER[tier]];
  if (resolveEquipmentInfo(weaponItemId)?.handling === "one_handed") items.push(SHIELD_BY_TIER[tier]);
  return items;
}

function segmentRewards(tier: Tier, segmentIndex: number) {
  const zoneDefId = WORLD_ZONE_IDS[FINAL_ZONE_BY_TIER[tier]];
  const placement = getWorldZonePlacement(zoneDefId);
  let fame = 0;
  let silver = 0;
  for (let encounterIndex = 0; encounterIndex < 5; encounterIndex += 1) {
    const reward = getEncounterRewards(placement.zoneIndexWithinBand, segmentIndex, encounterIndex, placement.bandId);
    fame += reward.fame;
    silver += reward.silver;
  }
  return { fame, silver };
}

/** Diagnostic only: measures the live world economy without changing balance. */
describe("T4-T8 fame/silver economy audit", () => {
  it("prints representative farmable fame/h and silver/h baselines", () => {
    const summaries = TIERS.map((tier) => {
      const zoneDefId = WORLD_ZONE_IDS[FINAL_ZONE_BY_TIER[tier]];
      let selected: null | {
        segmentIndex: number;
        clears: ReturnType<typeof runCombatRuntimeBenchmark>[];
      } = null;

      for (const segmentIndex of SEGMENT_CANDIDATES) {
        const results = WEAPONS_BY_TIER[tier].map((weaponItemId) => runCombatRuntimeBenchmark({
          label: `economy_t${tier}_s${segmentIndex + 1}`,
          weaponItemId,
          zoneDefId,
          segmentIndex,
          equipmentItemIds: equipmentFor(weaponItemId, tier),
          masteryLevel: MASTERY_BY_TIER[tier],
          enchantment: 3,
          useHealthPotions: false,
        }));
        const clears = results.filter((result) => result.clear);
        if (clears.length >= 3) {
          selected = { segmentIndex, clears };
          break;
        }
      }

      if (selected === null) {
        const segmentIndex = 0;
        const results = WEAPONS_BY_TIER[tier].map((weaponItemId) => runCombatRuntimeBenchmark({
          label: `economy_t${tier}_fallback_s1`,
          weaponItemId,
          zoneDefId,
          segmentIndex,
          equipmentItemIds: equipmentFor(weaponItemId, tier),
          masteryLevel: MASTERY_BY_TIER[tier],
          enchantment: 3,
          useHealthPotions: true,
        }));
        selected = { segmentIndex, clears: results.filter((result) => result.clear) };
      }

      const reward = segmentRewards(tier, selected.segmentIndex);
      const rates = selected.clears.map((result) => ({
        famePerHour: reward.fame * (3600 / result.seconds),
        silverPerHour: reward.silver * (3600 / result.seconds),
      }));
      const avg = (values: readonly number[]) => values.length === 0 ? 0 : values.reduce((sum, value) => sum + value, 0) / values.length;
      const fameRates = rates.map((rate) => rate.famePerHour);
      const silverRates = rates.map((rate) => rate.silverPerHour);

      return {
        tier,
        zone: FINAL_ZONE_BY_TIER[tier],
        segment: selected.segmentIndex + 1,
        clearingWeapons: selected.clears.length,
        segmentFame: reward.fame,
        segmentSilver: reward.silver,
        avgClearSeconds: Number(avg(selected.clears.map((result) => result.seconds)).toFixed(1)),
        avgFamePerHour: Math.round(avg(fameRates)),
        minFamePerHour: fameRates.length === 0 ? 0 : Math.round(Math.min(...fameRates)),
        maxFamePerHour: fameRates.length === 0 ? 0 : Math.round(Math.max(...fameRates)),
        avgSilverPerHour: Math.round(avg(silverRates)),
        minSilverPerHour: silverRates.length === 0 ? 0 : Math.round(Math.min(...silverRates)),
        maxSilverPerHour: silverRates.length === 0 ? 0 : Math.round(Math.max(...silverRates)),
      };
    });

    console.table(summaries);
    console.log("[T4_T8_FAME_SILVER_ECONOMY_BASELINE]", JSON.stringify(summaries, null, 2));

    expect(summaries).toHaveLength(TIERS.length);
    expect(summaries.every((summary) => summary.segmentFame > 0 && summary.segmentSilver > 0)).toBe(true);
    expect(summaries.every((summary) => summary.avgFamePerHour >= 0 && summary.avgSilverPerHour >= 0)).toBe(true);
  });
});

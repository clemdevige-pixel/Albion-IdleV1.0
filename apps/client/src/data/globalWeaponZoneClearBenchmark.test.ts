import { describe, expect, it } from "vitest";
import { runCombatRuntimeBenchmark } from "../runtime/CombatRuntimeBenchmarkHarness.js";
import { resolveCandidateRuntimeDamageTuning } from "./candidateWeaponBalanceBenchmark.js";
import { resolveEquipmentInfo } from "./itemContentCatalog.js";
import { WORLD_ZONE_CONTENT } from "./worldContentCatalog.js";

type Tier = 3 | 4 | 5 | 6 | 7 | 8;
type Enchantment = 0 | 1 | 2 | 3;

type TierProfile = {
  readonly mastery: number;
  readonly enchantment: Enchantment;
};

const TIER_PROFILE: Readonly<Record<Tier, TierProfile>> = {
  3: { mastery: 10, enchantment: 0 },
  4: { mastery: 23, enchantment: 3 },
  5: { mastery: 36, enchantment: 3 },
  6: { mastery: 46, enchantment: 3 },
  7: { mastery: 56, enchantment: 3 },
  8: { mastery: 65, enchantment: 3 },
};

const WEAPON_BY_TIER: Readonly<Record<Tier, readonly string[]>> = {
  3: [
    "item_weapon_sword_t3_broadsword",
    "item_weapon_bow_t3_longbow",
    "item_weapon_staff_t3_infernal",
    "item_weapon_gloves_t3_spiked_gauntlets",
    "item_weapon_dagger_t3_pair",
  ],
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
  8: [
    "item_weapon_sword_t8_broadsword",
    "item_weapon_bow_t8_longbow",
    "item_weapon_staff_t8_infernal",
    "item_weapon_gloves_t8_spiked_gauntlets",
    "item_weapon_dagger_t8_pair",
  ],
};

function armorForTier(tier: Tier): readonly string[] {
  if (tier === 3) {
    return ["item_iron_helmet", "item_leather_armor", "item_leather_boots", "item_traveler_cape"];
  }
  return [
    `item_helmet_t${tier}_reinforced`,
    `item_armor_t${tier}_leather`,
    `item_boots_t${tier}_leather`,
    "item_traveler_cape",
  ];
}

function equipmentFor(weaponItemId: string, tier: Tier): readonly string[] {
  const items = [...armorForTier(tier)];
  if (resolveEquipmentInfo(weaponItemId)?.handling === "one_handed") {
    items.push(`item_shield_t${tier}_reinforced`);
  }
  return items;
}

function weaponName(itemId: string, tier: Tier): string {
  if (itemId.includes("broadsword")) return "broadsword";
  if (itemId.includes("longbow")) return "longbow";
  if (itemId.includes("infernal")) return "infernal";
  if (itemId.includes("spiked_gauntlets")) return "spiked";
  if (itemId.includes("dagger")) return "dual_dagger";
  return itemId.replace("item_weapon_", "").replace(`_t${tier}_`, "_");
}

function round1(value: number): number {
  return Math.round(value * 10) / 10;
}

describe("global candidate weapon zone clear benchmark", () => {
  it("reuses the live runtime benchmark with benchmark-only candidate tuning across every world zone", () => {
    const detail: Array<{
      zone: string;
      band: string;
      tier: Tier;
      weapon: string;
      maxClearSegment: number;
      fullClear: boolean;
      secondsAtMaxClear: number | null;
      hpPercentAtMaxClear: number | null;
      observedDpsAtMaxClear: number | null;
    }> = [];

    for (const zone of Object.values(WORLD_ZONE_CONTENT)) {
      const tier = zone.tier;
      const profile = TIER_PROFILE[tier];
      for (const weaponItemId of WEAPON_BY_TIER[tier]) {
        let maxClearSegment = 0;
        let secondsAtMaxClear: number | null = null;
        let hpPercentAtMaxClear: number | null = null;
        let observedDpsAtMaxClear: number | null = null;

        for (let segmentIndex = 0; segmentIndex < 10; segmentIndex += 1) {
          const result = runCombatRuntimeBenchmark({
            label: `${String(zone.id)}_s${segmentIndex + 1}`,
            weaponItemId,
            zoneDefId: zone.id,
            segmentIndex,
            equipmentItemIds: equipmentFor(weaponItemId, tier),
            masteryLevel: profile.mastery,
            enchantment: profile.enchantment,
            useHealthPotions: false,
            damageTuning: resolveCandidateRuntimeDamageTuning(weaponItemId),
          });

          if (!result.clear) break;
          maxClearSegment = segmentIndex + 1;
          secondsAtMaxClear = round1(result.seconds);
          hpPercentAtMaxClear = round1(result.hpPercent);
          observedDpsAtMaxClear = round1(result.observedDps);
        }

        detail.push({
          zone: zone.name,
          band: zone.bandId,
          tier,
          weapon: weaponName(weaponItemId, tier),
          maxClearSegment,
          fullClear: maxClearSegment === 10,
          secondsAtMaxClear,
          hpPercentAtMaxClear,
          observedDpsAtMaxClear,
        });
      }
    }

    const summary = Object.values(WORLD_ZONE_CONTENT).map((zone) => {
      const rows = detail.filter((row) => row.zone === zone.name);
      const dagger = rows.find((row) => row.weapon === "dual_dagger");
      const bestClear = Math.max(...rows.map((row) => row.maxClearSegment));
      const worstClear = Math.min(...rows.map((row) => row.maxClearSegment));
      const daggerRank = dagger === undefined
        ? null
        : 1 + rows.filter((row) => row.maxClearSegment > dagger.maxClearSegment).length;
      return {
        zone: zone.name,
        band: zone.bandId,
        tier: zone.tier,
        daggerClear: dagger?.maxClearSegment ?? null,
        daggerRank,
        bestClear,
        worstClear,
        spread: bestClear - worstClear,
        fullClearWeapons: rows.filter((row) => row.fullClear).length,
      };
    });

    const weaponSummary = [...new Set(detail.map((row) => row.weapon))].map((weapon) => {
      const rows = detail.filter((row) => row.weapon === weapon);
      return {
        weapon,
        zones: rows.length,
        fullClears: rows.filter((row) => row.fullClear).length,
        totalSegmentsCleared: rows.reduce((sum, row) => sum + row.maxClearSegment, 0),
        avgSegmentsCleared: round1(rows.reduce((sum, row) => sum + row.maxClearSegment, 0) / rows.length),
      };
    }).sort((a, b) => b.totalSegmentsCleared - a.totalSegmentsCleared);

    console.table(summary);
    console.table(weaponSummary);

    expect(detail).toHaveLength(Object.values(WORLD_ZONE_CONTENT).length * 5);
    expect(summary).toHaveLength(Object.values(WORLD_ZONE_CONTENT).length);
    expect(detail.every((row) => row.maxClearSegment >= 0 && row.maxClearSegment <= 10)).toBe(true);
    expect(detail.filter((row) => row.weapon === "dual_dagger")).toHaveLength(Object.values(WORLD_ZONE_CONTENT).length);
  });
});

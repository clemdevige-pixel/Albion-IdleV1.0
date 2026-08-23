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
  it("compares candidate weapons on the exact same progression wall segments", () => {
    const progressionDepth: Array<{
      zoneId: (typeof WORLD_ZONE_CONTENT)[keyof typeof WORLD_ZONE_CONTENT]["id"];
      zone: string;
      band: string;
      tier: Tier;
      weapon: string;
      maxClearSegment: number;
    }> = [];

    for (const zone of Object.values(WORLD_ZONE_CONTENT)) {
      const tier = zone.tier;
      const profile = TIER_PROFILE[tier];

      for (const weaponItemId of WEAPON_BY_TIER[tier]) {
        let maxClearSegment = 0;

        for (let segmentIndex = 0; segmentIndex < 10; segmentIndex += 1) {
          const result = runCombatRuntimeBenchmark({
            label: `${String(zone.id)}_depth_s${String(segmentIndex + 1)}`,
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
        }

        progressionDepth.push({
          zoneId: zone.id,
          zone: zone.name,
          band: zone.bandId,
          tier,
          weapon: weaponName(weaponItemId, tier),
          maxClearSegment,
        });
      }
    }

    const wallRows: Array<{
      zone: string;
      band: string;
      tier: Tier;
      wallSegment: number;
      weapon: string;
      clear: boolean;
      seconds: number;
      hpPct: number;
      damageReceived: number;
      observedDps: number;
    }> = [];

    for (const zone of Object.values(WORLD_ZONE_CONTENT)) {
      const tier = zone.tier;
      const profile = TIER_PROFILE[tier];
      const zoneDepth = progressionDepth.filter((row) => row.zoneId === zone.id);
      const shallowestClear = Math.min(...zoneDepth.map((row) => row.maxClearSegment));
      if (shallowestClear >= 10) continue;

      const wallSegment = shallowestClear + 1;
      for (const weaponItemId of WEAPON_BY_TIER[tier]) {
        const result = runCombatRuntimeBenchmark({
          label: `${String(zone.id)}_wall_s${String(wallSegment)}`,
          weaponItemId,
          zoneDefId: zone.id,
          segmentIndex: wallSegment - 1,
          equipmentItemIds: equipmentFor(weaponItemId, tier),
          masteryLevel: profile.mastery,
          enchantment: profile.enchantment,
          useHealthPotions: false,
          damageTuning: resolveCandidateRuntimeDamageTuning(weaponItemId),
        });

        wallRows.push({
          zone: zone.name,
          band: zone.bandId,
          tier,
          wallSegment,
          weapon: weaponName(weaponItemId, tier),
          clear: result.clear,
          seconds: round1(result.seconds),
          hpPct: round1(result.hpPercent),
          damageReceived: round1(result.damageReceived),
          observedDps: round1(result.observedDps),
        });
      }
    }

    const weaponSummary = [...new Set(wallRows.map((row) => row.weapon))].map((weapon) => {
      const rows = wallRows.filter((row) => row.weapon === weapon);
      const clears = rows.filter((row) => row.clear);
      return {
        weapon,
        walls: rows.length,
        clears: clears.length,
        clearRatePct: round1((clears.length / Math.max(1, rows.length)) * 100),
        avgSeconds: round1(rows.reduce((sum, row) => sum + row.seconds, 0) / rows.length),
        avgHpPct: round1(rows.reduce((sum, row) => sum + row.hpPct, 0) / rows.length),
        avgDamageReceived: round1(rows.reduce((sum, row) => sum + row.damageReceived, 0) / rows.length),
        avgObservedDps: round1(rows.reduce((sum, row) => sum + row.observedDps, 0) / rows.length),
      };
    }).sort((a, b) => b.clearRatePct - a.clearRatePct || a.avgSeconds - b.avgSeconds);

    console.table(wallRows);
    console.table(weaponSummary);

    expect(progressionDepth).toHaveLength(Object.values(WORLD_ZONE_CONTENT).length * 5);
    expect(wallRows.length).toBeGreaterThan(0);
    expect(wallRows.every((row) => row.wallSegment >= 1 && row.wallSegment <= 10)).toBe(true);
    expect(wallRows.length % 5).toBe(0);
  });
});

import { describe, expect, it } from "vitest";
import { runCombatRuntimeBenchmark } from "../runtime/CombatRuntimeBenchmarkHarness.js";
import { resolveEquipmentInfo } from "./itemContentCatalog.js";
import { WORLD_ZONE_CONTENT } from "./worldContentCatalog.js";

type Tier = 4 | 5 | 6 | 7 | 8;
type Enchantment = 0 | 1 | 2 | 3;

const WEAPON_FAMILIES = ["broadsword", "longbow", "infernal", "spiked", "dual_dagger"] as const;
type WeaponFamily = (typeof WEAPON_FAMILIES)[number];

const MASTERY_BY_STAGE: Readonly<Record<Tier, Readonly<Record<Enchantment, number>>>> = {
  4: { 0: 16, 1: 19, 2: 22, 3: 22 },
  5: { 0: 27, 1: 31, 2: 35, 3: 35 },
  6: { 0: 39, 1: 41, 2: 43, 3: 45 },
  7: { 0: 49, 1: 51, 2: 53, 3: 55 },
  8: { 0: 59, 1: 61, 2: 63, 3: 65 },
};

function weaponId(tier: Tier, family: WeaponFamily): string {
  if (family === "broadsword") return `item_weapon_sword_t${tier}_broadsword`;
  if (family === "longbow") return `item_weapon_bow_t${tier}_longbow`;
  if (family === "infernal") return `item_weapon_staff_t${tier}_infernal`;
  if (family === "spiked") return `item_weapon_gloves_t${tier}_spiked_gauntlets`;
  return `item_weapon_dagger_t${tier}_pair`;
}

function armorIds(tier: Tier): readonly string[] {
  return [
    `item_helmet_t${tier}_reinforced`,
    `item_armor_t${tier}_leather`,
    `item_boots_t${tier}_leather`,
    "item_traveler_cape",
  ];
}

function equipmentFor(weaponItemId: string, tier: Tier): readonly string[] {
  const items = [...armorIds(tier)];
  if (resolveEquipmentInfo(weaponItemId)?.handling === "one_handed") items.push(`item_shield_t${tier}_reinforced`);
  return items;
}

function zonesForTier(tier: Tier) {
  return Object.values(WORLD_ZONE_CONTENT).filter((zone) => zone.tier === tier);
}

describe("full enchantment progression ladder sweep", () => {
  it("measures what each .0 -> .1 -> .2 -> .3 upgrade buys for every baseline weapon", () => {
    const rows: Array<{
      tier: Tier;
      enchantment: Enchantment;
      mastery: number;
      weapon: WeaponFamily;
      progressPoints: number;
      deepestZone: string | null;
      deepestSegment: number;
      gainVsPrevious: number | null;
    }> = [];

    for (const tier of [4, 5, 6, 7, 8] as const) {
      const zones = zonesForTier(tier);
      for (const weapon of WEAPON_FAMILIES) {
        let previousProgress: number | null = null;
        for (const enchantment of [0, 1, 2, 3] as const) {
          const weaponItemId = weaponId(tier, weapon);
          const mastery = MASTERY_BY_STAGE[tier][enchantment];
          let progressPoints = 0;
          let deepestZone: string | null = null;
          let deepestSegment = 0;
          let blocked = false;

          for (let zoneIndex = 0; zoneIndex < zones.length && !blocked; zoneIndex += 1) {
            const zone = zones[zoneIndex];
            if (zone === undefined) continue;
            for (let segmentIndex = 0; segmentIndex < 10; segmentIndex += 1) {
              const result = runCombatRuntimeBenchmark({
                label: `ladder_t${tier}_${enchantment}_${weapon}_${String(zone.id)}_s${segmentIndex + 1}`,
                weaponItemId,
                zoneDefId: zone.id,
                segmentIndex,
                equipmentItemIds: equipmentFor(weaponItemId, tier),
                masteryLevel: mastery,
                enchantment,
                useHealthPotions: false,
              });

              if (!result.clear) {
                blocked = true;
                break;
              }

              progressPoints = zoneIndex * 10 + segmentIndex + 1;
              deepestZone = zone.name;
              deepestSegment = segmentIndex + 1;
            }
          }

          rows.push({
            tier,
            enchantment,
            mastery,
            weapon,
            progressPoints,
            deepestZone,
            deepestSegment,
            gainVsPrevious: previousProgress === null ? null : progressPoints - previousProgress,
          });
          previousProgress = progressPoints;
        }
      }
    }

    console.log("[ENCHANTMENT_PROGRESSION_LADDER]");
    console.table(rows);

    const summary = ([4, 5, 6, 7, 8] as const).flatMap((tier) =>
      ([0, 1, 2, 3] as const).map((enchantment) => {
        const stage = rows.filter((row) => row.tier === tier && row.enchantment === enchantment);
        return {
          tier,
          enchantment,
          mastery: MASTERY_BY_STAGE[tier][enchantment],
          minProgress: Math.min(...stage.map((row) => row.progressPoints)),
          avgProgress: Number((stage.reduce((sum, row) => sum + row.progressPoints, 0) / stage.length).toFixed(1)),
          maxProgress: Math.max(...stage.map((row) => row.progressPoints)),
          minGain: enchantment === 0 ? null : Math.min(...stage.map((row) => row.gainVsPrevious ?? 0)),
          avgGain: enchantment === 0 ? null : Number((stage.reduce((sum, row) => sum + (row.gainVsPrevious ?? 0), 0) / stage.length).toFixed(1)),
          maxGain: enchantment === 0 ? null : Math.max(...stage.map((row) => row.gainVsPrevious ?? 0)),
        };
      }),
    );

    console.log("[ENCHANTMENT_PROGRESSION_LADDER_SUMMARY]");
    console.table(summary);
    console.log("[ENCHANTMENT_PROGRESSION_LADDER_JSON]", JSON.stringify(rows, null, 2));

    expect(rows).toHaveLength(5 * 5 * 4);
    expect(rows.every((row) => row.progressPoints >= 0 && row.progressPoints <= 50)).toBe(true);
  }, 60_000);
});

import { afterEach, describe, expect, it } from "vitest";
import { ENCHANTMENT_ITEM_POWER } from "@game/gameplay";
import { runCombatRuntimeBenchmark } from "../runtime/CombatRuntimeBenchmarkHarness.js";
import { resolveEquipmentInfo } from "./itemContentCatalog.js";
import { WORLD_ZONE_CONTENT } from "./worldContentCatalog.js";

type Tier = 4 | 5 | 6 | 7 | 8;
type Enchantment = 0 | 1 | 2 | 3;
type Curve = {
  readonly id: string;
  readonly ip: Readonly<Record<Enchantment, number>>;
};

const CURVES: readonly Curve[] = [
  { id: "current_50_100_150", ip: { 0: 0, 1: 50, 2: 100, 3: 150 } },
  { id: "progressive_soft_60_130_210", ip: { 0: 0, 1: 60, 2: 130, 3: 210 } },
  { id: "progressive_medium_60_135_225", ip: { 0: 0, 1: 60, 2: 135, 3: 225 } },
  { id: "progressive_strong_65_145_235", ip: { 0: 0, 1: 65, 2: 145, 3: 235 } },
];

const ORIGINAL_ENCHANTMENT_IP = { ...ENCHANTMENT_ITEM_POWER };

const MASTERY_BY_TIER_AND_ENCHANT: Readonly<Record<Tier, Readonly<Record<Enchantment, number>>>> = {
  4: { 0: 16, 1: 19, 2: 22, 3: 22 },
  5: { 0: 27, 1: 31, 2: 35, 3: 35 },
  6: { 0: 39, 1: 41, 2: 43, 3: 45 },
  7: { 0: 49, 1: 51, 2: 53, 3: 55 },
  8: { 0: 59, 1: 61, 2: 63, 3: 65 },
};

const WEAPON_FAMILIES = ["sword_broadsword", "bow_longbow", "staff_infernal", "gloves_spiked_gauntlets", "dagger_pair"] as const;

function weaponId(tier: Tier, family: string): string {
  const [kind, ...rest] = family.split("_");
  return `item_weapon_${kind}_t${String(tier)}_${rest.join("_")}`;
}

function weaponName(itemId: string): string {
  if (itemId.includes("broadsword")) return "broadsword";
  if (itemId.includes("longbow")) return "longbow";
  if (itemId.includes("infernal")) return "infernal";
  if (itemId.includes("spiked_gauntlets")) return "spiked";
  if (itemId.includes("dagger")) return "dual_dagger";
  return itemId;
}

function equipmentFor(weaponItemId: string, tier: Tier): readonly string[] {
  const items = [
    `item_helmet_t${String(tier)}_reinforced`,
    `item_armor_t${String(tier)}_leather`,
    `item_boots_t${String(tier)}_leather`,
    "item_traveler_cape",
  ];
  if (resolveEquipmentInfo(weaponItemId)?.handling === "one_handed") items.push(`item_shield_t${String(tier)}_reinforced`);
  return items;
}

function setCurve(curve: Curve): void {
  const mutable = ENCHANTMENT_ITEM_POWER as Record<number, number>;
  mutable[0] = curve.ip[0];
  mutable[1] = curve.ip[1];
  mutable[2] = curve.ip[2];
  mutable[3] = curve.ip[3];
}

function restoreCurve(): void {
  const mutable = ENCHANTMENT_ITEM_POWER as Record<number, number>;
  for (const [level, value] of Object.entries(ORIGINAL_ENCHANTMENT_IP)) mutable[Number(level)] = value;
}

function bandZones(tier: Tier) {
  return Object.values(WORLD_ZONE_CONTENT).filter((zone) => zone.tier === tier);
}

function progressFor(tier: Tier, enchantment: Enchantment, weaponItemId: string): number {
  const zones = bandZones(tier);
  let progress = 0;
  for (let zoneIndex = 0; zoneIndex < zones.length; zoneIndex += 1) {
    const zone = zones[zoneIndex];
    if (zone === undefined) continue;
    for (let segmentIndex = 0; segmentIndex < 10; segmentIndex += 1) {
      const result = runCombatRuntimeBenchmark({
        label: `progressive_curve_t${String(tier)}_${String(enchantment)}_${weaponName(weaponItemId)}_${String(zone.id)}_s${String(segmentIndex + 1)}`,
        weaponItemId,
        zoneDefId: zone.id,
        segmentIndex,
        equipmentItemIds: equipmentFor(weaponItemId, tier),
        masteryLevel: MASTERY_BY_TIER_AND_ENCHANT[tier][enchantment],
        enchantment,
        useHealthPotions: false,
      });
      if (!result.clear) return progress;
      progress += 1;
    }
  }
  return progress;
}

afterEach(() => restoreCurve());

describe("progressive enchantment curve sweep", () => {
  it("compares cumulative non-linear enchantment IP curves without changing live balance", () => {
    const detail: Array<{
      curve: string;
      tier: Tier;
      weapon: string;
      enchantment: Enchantment;
      ip: number;
      progress: number;
      gain: number | null;
    }> = [];

    for (const curve of CURVES) {
      setCurve(curve);
      for (const tier of [4, 5, 6, 7, 8] as const) {
        for (const family of WEAPON_FAMILIES) {
          const itemId = weaponId(tier, family);
          let previous: number | null = null;
          for (const enchantment of [0, 1, 2, 3] as const) {
            const progress = progressFor(tier, enchantment, itemId);
            detail.push({
              curve: curve.id,
              tier,
              weapon: weaponName(itemId),
              enchantment,
              ip: curve.ip[enchantment],
              progress,
              gain: previous === null ? null : progress - previous,
            });
            previous = progress;
          }
        }
      }
      restoreCurve();
    }

    const summary = CURVES.map((curve) => {
      const gains = detail.filter((row) => row.curve === curve.id && row.gain !== null).map((row) => row.gain ?? 0);
      return {
        curve: curve.id,
        ip1: curve.ip[1],
        ip2: curve.ip[2],
        ip3: curve.ip[3],
        deadSteps: gains.filter((gain) => gain <= 0).length,
        weakSteps1to2: gains.filter((gain) => gain > 0 && gain <= 2).length,
        meaningfulSteps3to10: gains.filter((gain) => gain >= 3 && gain <= 10).length,
        hugeSteps11Plus: gains.filter((gain) => gain >= 11).length,
        avgGain: Number((gains.reduce((sum, gain) => sum + gain, 0) / gains.length).toFixed(2)),
        maxGain: Math.max(...gains),
      };
    });

    const byTier = CURVES.flatMap((curve) => ([4, 5, 6, 7, 8] as const).map((tier) => {
      const gains = detail.filter((row) => row.curve === curve.id && row.tier === tier && row.gain !== null).map((row) => row.gain ?? 0);
      return {
        curve: curve.id,
        tier,
        deadSteps: gains.filter((gain) => gain <= 0).length,
        weakSteps1to2: gains.filter((gain) => gain > 0 && gain <= 2).length,
        hugeSteps11Plus: gains.filter((gain) => gain >= 11).length,
        avgGain: Number((gains.reduce((sum, gain) => sum + gain, 0) / gains.length).toFixed(2)),
        maxGain: Math.max(...gains),
      };
    }));

    console.log("[ENCHANTMENT_PROGRESSIVE_CURVE_SUMMARY]");
    console.table(summary);
    console.log("[ENCHANTMENT_PROGRESSIVE_CURVE_BY_TIER]");
    console.table(byTier);
    console.log("[ENCHANTMENT_PROGRESSIVE_CURVE_DETAIL_JSON]", JSON.stringify(detail, null, 2));

    expect(summary).toHaveLength(CURVES.length);
    expect(detail).toHaveLength(CURVES.length * 5 * 5 * 4);
    expect((ENCHANTMENT_ITEM_POWER as Record<number, number>)[1]).toBe(ORIGINAL_ENCHANTMENT_IP[1]);
  }, 60_000);
});

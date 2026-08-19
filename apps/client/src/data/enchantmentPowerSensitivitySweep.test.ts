import { afterEach, describe, expect, it } from "vitest";
import { ENCHANTMENT_ITEM_POWER } from "@game/gameplay";
import { runCombatRuntimeBenchmark } from "../runtime/CombatRuntimeBenchmarkHarness.js";
import { resolveEquipmentInfo } from "./itemContentCatalog.js";
import { WORLD_ZONE_CONTENT } from "./worldContentCatalog.js";

type Tier = 4 | 5 | 6 | 7 | 8;
type Enchantment = 0 | 1 | 2 | 3;

const STEP_CANDIDATES = [50, 60, 75, 100] as const;
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

function setStep(step: number): void {
  const mutable = ENCHANTMENT_ITEM_POWER as Record<number, number>;
  mutable[0] = 0;
  mutable[1] = step;
  mutable[2] = step * 2;
  mutable[3] = step * 3;
  mutable[4] = step * 4;
}

function restoreStep(): void {
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
        label: `enchant_sensitivity_t${String(tier)}_${String(enchantment)}_${weaponName(weaponItemId)}_${String(zone.id)}_s${String(segmentIndex + 1)}`,
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

afterEach(() => restoreStep());

describe("enchantment power sensitivity sweep", () => {
  it("compares candidate IP steps without changing live balance data", () => {
    const detail: Array<{
      stepIp: number;
      tier: Tier;
      weapon: string;
      enchantment: Enchantment;
      progress: number;
      gain: number | null;
    }> = [];

    for (const stepIp of STEP_CANDIDATES) {
      setStep(stepIp);
      for (const tier of [4, 5, 6, 7, 8] as const) {
        for (const family of WEAPON_FAMILIES) {
          const itemId = weaponId(tier, family);
          let previous: number | null = null;
          for (const enchantment of [0, 1, 2, 3] as const) {
            const progress = progressFor(tier, enchantment, itemId);
            detail.push({
              stepIp,
              tier,
              weapon: weaponName(itemId),
              enchantment,
              progress,
              gain: previous === null ? null : progress - previous,
            });
            previous = progress;
          }
        }
      }
      restoreStep();
    }

    const summary = STEP_CANDIDATES.map((stepIp) => {
      const transitions = detail.filter((row) => row.stepIp === stepIp && row.gain !== null);
      const gains = transitions.map((row) => row.gain ?? 0);
      return {
        stepIp,
        statGainPerEnchantPercent: stepIp * 0.2,
        transitions: gains.length,
        deadSteps: gains.filter((gain) => gain <= 0).length,
        weakSteps1to2: gains.filter((gain) => gain > 0 && gain <= 2).length,
        meaningfulSteps3Plus: gains.filter((gain) => gain >= 3).length,
        hugeSteps11Plus: gains.filter((gain) => gain >= 11).length,
        minGain: Math.min(...gains),
        avgGain: Number((gains.reduce((sum, gain) => sum + gain, 0) / gains.length).toFixed(2)),
        maxGain: Math.max(...gains),
      };
    });

    const deadByTierAndCandidate = STEP_CANDIDATES.flatMap((stepIp) => ([4, 5, 6, 7, 8] as const).map((tier) => {
      const gains = detail.filter((row) => row.stepIp === stepIp && row.tier === tier && row.gain !== null).map((row) => row.gain ?? 0);
      return {
        stepIp,
        tier,
        deadSteps: gains.filter((gain) => gain <= 0).length,
        transitions: gains.length,
        avgGain: Number((gains.reduce((sum, gain) => sum + gain, 0) / gains.length).toFixed(2)),
        maxGain: Math.max(...gains),
      };
    }));

    console.log("[ENCHANTMENT_POWER_SENSITIVITY_SUMMARY]");
    console.table(summary);
    console.log("[ENCHANTMENT_POWER_SENSITIVITY_BY_TIER]");
    console.table(deadByTierAndCandidate);
    console.log("[ENCHANTMENT_POWER_SENSITIVITY_DETAIL_JSON]", JSON.stringify(detail, null, 2));

    expect(summary).toHaveLength(STEP_CANDIDATES.length);
    expect(detail).toHaveLength(STEP_CANDIDATES.length * 5 * 5 * 4);
    expect((ENCHANTMENT_ITEM_POWER as Record<number, number>)[1]).toBe(ORIGINAL_ENCHANTMENT_IP[1]);
  }, 60_000);
});

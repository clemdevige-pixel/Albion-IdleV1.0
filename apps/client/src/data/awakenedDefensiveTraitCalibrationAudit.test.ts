import { describe, expect, it } from "vitest";
import { RESISTANCE_CAP_PERCENT } from "@game/gameplay";
import { runCombatRuntimeBenchmark } from "../runtime/CombatRuntimeBenchmarkHarness.js";
import { WORLD_ZONE_IDS, type WorldZoneKey } from "./worldContentCatalog.js";

const TIERS = [4, 5, 6, 7, 8] as const;
type Tier = (typeof TIERS)[number];

const MASTERY_BY_TIER = { 4: 20, 5: 35, 6: 45, 7: 55, 8: 65 } as const satisfies Readonly<Record<Tier, number>>;
const FINAL_ZONE_BY_TIER = {
  4: "mountain",
  5: "ironveil",
  6: "ashenpeak",
  7: "doompeak",
  8: "blackspire",
} as const satisfies Readonly<Record<Tier, WorldZoneKey>>;

const TWO_HANDED_WEAPON_BY_TIER = {
  4: "item_weapon_bow_t4_longbow",
  5: "item_weapon_bow_t5_longbow",
  6: "item_weapon_bow_t6_longbow",
  7: "item_weapon_bow_t7_longbow",
  8: "item_weapon_bow_t8_longbow",
} as const;

const ONE_HANDED_WEAPON_BY_TIER = {
  4: "item_weapon_sword_t4_broadsword",
  5: "item_weapon_sword_t5_broadsword",
  6: "item_weapon_sword_t6_broadsword",
  7: "item_weapon_sword_t7_broadsword",
  8: "item_weapon_sword_t8_broadsword",
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

const HP_PROBES = [1, 3, 5, 10] as const;
const RESISTANCE_PROBES = [0.1, 0.25, 0.5, 1] as const;

type Baseline = {
  readonly tier: Tier;
  readonly profile: "2H" | "1H+shield";
  readonly hp: number;
  readonly armor: number;
  readonly mr: number;
  readonly effectiveArmor: number;
  readonly effectiveMr: number;
  readonly armorHeadroom: number;
  readonly mrHeadroom: number;
};

function effectiveResistance(value: number): number {
  return Math.min(Math.max(value, 0), RESISTANCE_CAP_PERCENT);
}

function ehp(hp: number, resistance: number): number {
  return hp / (1 - effectiveResistance(resistance) / 100);
}

function pctGain(after: number, before: number): number {
  return Number((((after / before) - 1) * 100).toFixed(3));
}

function equipmentFor(tier: Tier, includeShield: boolean): readonly string[] {
  return includeShield ? [...ARMOR_BY_TIER[tier], SHIELD_BY_TIER[tier]] : ARMOR_BY_TIER[tier];
}

function readBaseline(tier: Tier, profile: Baseline["profile"]): Baseline {
  const includeShield = profile === "1H+shield";
  const weaponItemId = includeShield ? ONE_HANDED_WEAPON_BY_TIER[tier] : TWO_HANDED_WEAPON_BY_TIER[tier];
  const result = runCombatRuntimeBenchmark({
    label: `awakened_defense_t${tier}_${profile}`,
    weaponItemId,
    zoneDefId: WORLD_ZONE_IDS[FINAL_ZONE_BY_TIER[tier]],
    segmentIndex: 0,
    equipmentItemIds: equipmentFor(tier, includeShield),
    masteryLevel: MASTERY_BY_TIER[tier],
    enchantment: 3,
    useHealthPotions: false,
  });
  return {
    tier,
    profile,
    hp: result.maxHealth,
    armor: result.armor,
    mr: result.magicResistance,
    effectiveArmor: effectiveResistance(result.armor),
    effectiveMr: effectiveResistance(result.magicResistance),
    armorHeadroom: Math.max(0, RESISTANCE_CAP_PERCENT - effectiveResistance(result.armor)),
    mrHeadroom: Math.max(0, RESISTANCE_CAP_PERCENT - effectiveResistance(result.magicResistance)),
  };
}

describe("awakened defensive trait calibration audit", () => {
  it("measures flat HP/Armor/MR value across T4-T8 reference builds", () => {
    const baselines = TIERS.flatMap((tier) => [readBaseline(tier, "2H"), readBaseline(tier, "1H+shield")]);

    const rows = baselines.flatMap((base) => {
      const physicalBefore = ehp(base.hp, base.armor);
      const magicalBefore = ehp(base.hp, base.mr);
      const hpRows = HP_PROBES.map((delta) => ({
        tier: base.tier,
        profile: base.profile,
        trait: "HP",
        delta,
        hp: base.hp,
        armor: base.armor,
        mr: base.mr,
        effectiveArmor: base.effectiveArmor,
        effectiveMr: base.effectiveMr,
        physicalEhpGainPct: pctGain(ehp(base.hp + delta, base.armor), physicalBefore),
        magicalEhpGainPct: pctGain(ehp(base.hp + delta, base.mr), magicalBefore),
      }));
      const armorRows = RESISTANCE_PROBES.map((delta) => ({
        tier: base.tier,
        profile: base.profile,
        trait: "Armor",
        delta,
        hp: base.hp,
        armor: base.armor,
        mr: base.mr,
        effectiveArmor: base.effectiveArmor,
        effectiveMr: base.effectiveMr,
        physicalEhpGainPct: pctGain(ehp(base.hp, base.armor + delta), physicalBefore),
        magicalEhpGainPct: 0,
      }));
      const mrRows = RESISTANCE_PROBES.map((delta) => ({
        tier: base.tier,
        profile: base.profile,
        trait: "MR",
        delta,
        hp: base.hp,
        armor: base.armor,
        mr: base.mr,
        effectiveArmor: base.effectiveArmor,
        effectiveMr: base.effectiveMr,
        physicalEhpGainPct: 0,
        magicalEhpGainPct: pctGain(ehp(base.hp, base.mr + delta), magicalBefore),
      }));
      return [...hpRows, ...armorRows, ...mrRows];
    });

    console.table(baselines);
    console.table(rows);
    console.log("[AWAKENED_DEFENSIVE_TRAIT_BASELINES]", JSON.stringify(baselines, null, 2));
    console.log("[AWAKENED_DEFENSIVE_TRAIT_PROBES]", JSON.stringify(rows, null, 2));

    expect(baselines).toHaveLength(TIERS.length * 2);
    expect(rows).toHaveLength(baselines.length * (HP_PROBES.length + RESISTANCE_PROBES.length * 2));
    expect(rows.every((row) => Number.isFinite(row.physicalEhpGainPct) && Number.isFinite(row.magicalEhpGainPct))).toBe(true);
  });
});

import { describe, expect, it } from "vitest";
import { RESISTANCE_CAP_PERCENT, calculateDamage } from "@game/gameplay";
import { runCombatRuntimeBenchmark, type BenchmarkEnchantment } from "../runtime/CombatRuntimeBenchmarkHarness.js";
import { WORLD_ZONE_IDS, type WorldZoneKey } from "./worldContentCatalog.js";

const TIERS = [4, 5, 6, 7, 8] as const;
type Tier = (typeof TIERS)[number];

const FINAL_ZONE_BY_TIER = {
  4: "mountain",
  5: "ironveil",
  6: "ashenpeak",
  7: "doompeak",
  8: "blackspire",
} as const satisfies Readonly<Record<Tier, WorldZoneKey>>;

const TARGET_MASTERY_BY_TIER = { 4: 20, 5: 35, 6: 45, 7: 55, 8: 65 } as const satisfies Readonly<Record<Tier, number>>;

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

type Profile = "2H" | "1H+shield";

type AuditRow = {
  readonly tier: Tier;
  readonly profile: Profile;
  readonly enchantment: BenchmarkEnchantment;
  readonly mastery: number;
  readonly hp: number;
  readonly rawArmor: number;
  readonly rawMr: number;
  readonly effectiveArmor: number;
  readonly effectiveMr: number;
  readonly wastedArmor: number;
  readonly wastedMr: number;
  readonly physicalDamageFrom100: number;
  readonly magicalDamageFrom100: number;
  readonly physicalMitigationPct: number;
  readonly magicalMitigationPct: number;
};

function equipmentFor(tier: Tier, profile: Profile): readonly string[] {
  return profile === "1H+shield"
    ? [...ARMOR_BY_TIER[tier], SHIELD_BY_TIER[tier]]
    : ARMOR_BY_TIER[tier];
}

function weaponFor(tier: Tier, profile: Profile): string {
  return profile === "1H+shield" ? ONE_HANDED_WEAPON_BY_TIER[tier] : TWO_HANDED_WEAPON_BY_TIER[tier];
}

function buildRow(tier: Tier, profile: Profile, enchantment: BenchmarkEnchantment, mastery: number): AuditRow {
  const result = runCombatRuntimeBenchmark({
    label: `defense_chain_t${tier}_${profile}_e${enchantment}_m${mastery}`,
    weaponItemId: weaponFor(tier, profile),
    zoneDefId: WORLD_ZONE_IDS[FINAL_ZONE_BY_TIER[tier]],
    segmentIndex: 0,
    equipmentItemIds: equipmentFor(tier, profile),
    enchantment,
    masteryLevel: mastery,
    useHealthPotions: false,
  });

  const physical = calculateDamage(
    100,
    { physicalDamage: 0, magicalDamage: 0 },
    { armor: result.armor, magicResistance: result.magicResistance },
    "physical",
  );
  const magical = calculateDamage(
    100,
    { physicalDamage: 0, magicalDamage: 0 },
    { armor: result.armor, magicResistance: result.magicResistance },
    "magical",
  );

  const effectiveArmor = Math.min(Math.max(result.armor, 0), RESISTANCE_CAP_PERCENT);
  const effectiveMr = Math.min(Math.max(result.magicResistance, 0), RESISTANCE_CAP_PERCENT);

  return {
    tier,
    profile,
    enchantment,
    mastery,
    hp: result.maxHealth,
    rawArmor: result.armor,
    rawMr: result.magicResistance,
    effectiveArmor,
    effectiveMr,
    wastedArmor: Math.max(0, result.armor - effectiveArmor),
    wastedMr: Math.max(0, result.magicResistance - effectiveMr),
    physicalDamageFrom100: Number(physical.mitigatedDamage.toFixed(2)),
    magicalDamageFrom100: Number(magical.mitigatedDamage.toFixed(2)),
    physicalMitigationPct: Number((100 - physical.mitigatedDamage).toFixed(2)),
    magicalMitigationPct: Number((100 - magical.mitigatedDamage).toFixed(2)),
  };
}

/**
 * Diagnostic only.
 * Audits the complete defensive chain currently used by live combat:
 * authored equipment + enchantment/mastery -> computed Armor/MR -> mitigation cap.
 * This test must not encode a replacement formula or rebalance values.
 */
describe("defensive mitigation chain audit", () => {
  it("prints where Armor/MR progression stops affecting live mitigation across T4-T8", () => {
    const rows: AuditRow[] = [];

    for (const tier of TIERS) {
      for (const profile of ["2H", "1H+shield"] as const) {
        rows.push(buildRow(tier, profile, 0, 1));
        rows.push(buildRow(tier, profile, 3, 1));
        rows.push(buildRow(tier, profile, 3, TARGET_MASTERY_BY_TIER[tier]));
      }
    }

    const summary = TIERS.flatMap((tier) => (["2H", "1H+shield"] as const).map((profile) => {
      const base = rows.find((row) => row.tier === tier && row.profile === profile && row.enchantment === 0 && row.mastery === 1);
      const enchanted = rows.find((row) => row.tier === tier && row.profile === profile && row.enchantment === 3 && row.mastery === 1);
      const target = rows.find((row) => row.tier === tier && row.profile === profile && row.enchantment === 3 && row.mastery === TARGET_MASTERY_BY_TIER[tier]);
      if (base === undefined || enchanted === undefined || target === undefined) throw new Error(`Missing defensive audit row T${tier} ${profile}`);
      return {
        tier,
        profile,
        baseArmor: base.rawArmor,
        baseMr: base.rawMr,
        enchantedArmor: enchanted.rawArmor,
        enchantedMr: enchanted.rawMr,
        targetArmor: target.rawArmor,
        targetMr: target.rawMr,
        targetEffectiveArmor: target.effectiveArmor,
        targetEffectiveMr: target.effectiveMr,
        wastedArmor: target.wastedArmor,
        wastedMr: target.wastedMr,
        wastedArmorPct: target.rawArmor > 0 ? Number(((target.wastedArmor / target.rawArmor) * 100).toFixed(1)) : 0,
        wastedMrPct: target.rawMr > 0 ? Number(((target.wastedMr / target.rawMr) * 100).toFixed(1)) : 0,
        damageTakenPhysical: target.physicalDamageFrom100,
        damageTakenMagical: target.magicalDamageFrom100,
      };
    }));

    const anomalies = summary.flatMap((row) => {
      const found: string[] = [];
      if (row.wastedArmor > 0) found.push(`T${row.tier} ${row.profile}: ${row.wastedArmor} Armor (${row.wastedArmorPct}%) has no mitigation value`);
      if (row.wastedMr > 0) found.push(`T${row.tier} ${row.profile}: ${row.wastedMr} MR (${row.wastedMrPct}%) has no mitigation value`);
      return found;
    });

    console.table(summary);
    console.table(rows);
    console.log("[DEFENSIVE_MITIGATION_CHAIN_ANOMALIES]", JSON.stringify(anomalies, null, 2));
    console.log("[DEFENSIVE_MITIGATION_CHAIN_ROWS]", JSON.stringify(rows, null, 2));

    expect(rows).toHaveLength(TIERS.length * 2 * 3);
    expect(rows.every((row) => Number.isFinite(row.physicalDamageFrom100) && Number.isFinite(row.magicalDamageFrom100))).toBe(true);
    expect(rows.every((row) => row.effectiveArmor <= RESISTANCE_CAP_PERCENT && row.effectiveMr <= RESISTANCE_CAP_PERCENT)).toBe(true);
  });
});

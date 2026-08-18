import { describe, expect, it } from "vitest";
import { calculateDamage, calculateResistanceMitigation } from "@game/gameplay";
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
  readonly physicalMitigationPct: number;
  readonly magicalMitigationPct: number;
  readonly physicalDamageFrom100: number;
  readonly magicalDamageFrom100: number;
  readonly armorPlus10MitigationGainPct: number;
  readonly mrPlus10MitigationGainPct: number;
};

function equipmentFor(tier: Tier, profile: Profile): readonly string[] {
  return profile === "1H+shield"
    ? [...ARMOR_BY_TIER[tier], SHIELD_BY_TIER[tier]]
    : ARMOR_BY_TIER[tier];
}

function weaponFor(tier: Tier, profile: Profile): string {
  return profile === "1H+shield" ? ONE_HANDED_WEAPON_BY_TIER[tier] : TWO_HANDED_WEAPON_BY_TIER[tier];
}

function mitigationPct(resistance: number): number {
  return Number((calculateResistanceMitigation(resistance) * 100).toFixed(2));
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

  const physical = calculateDamage(100, { physicalDamage: 0, magicalDamage: 0 }, { armor: result.armor, magicResistance: result.magicResistance }, "physical");
  const magical = calculateDamage(100, { physicalDamage: 0, magicalDamage: 0 }, { armor: result.armor, magicResistance: result.magicResistance }, "magical");
  const armorMitigation = mitigationPct(result.armor);
  const mrMitigation = mitigationPct(result.magicResistance);

  return {
    tier,
    profile,
    enchantment,
    mastery,
    hp: result.maxHealth,
    rawArmor: result.armor,
    rawMr: result.magicResistance,
    physicalMitigationPct: armorMitigation,
    magicalMitigationPct: mrMitigation,
    physicalDamageFrom100: Number(physical.mitigatedDamage.toFixed(2)),
    magicalDamageFrom100: Number(magical.mitigatedDamage.toFixed(2)),
    armorPlus10MitigationGainPct: Number((mitigationPct(result.armor + 10) - armorMitigation).toFixed(2)),
    mrPlus10MitigationGainPct: Number((mitigationPct(result.magicResistance + 10) - mrMitigation).toFixed(2)),
  };
}

/** Diagnostic only: validates the live authored stats against the diminishing-return mitigation curve. */
describe("defensive mitigation chain audit", () => {
  it("prints live mitigation and confirms additional resistance keeps value across T4-T8", () => {
    const rows: AuditRow[] = [];

    for (const tier of TIERS) {
      for (const profile of ["2H", "1H+shield"] as const) {
        rows.push(buildRow(tier, profile, 0, 1));
        rows.push(buildRow(tier, profile, 3, 1));
        rows.push(buildRow(tier, profile, 3, TARGET_MASTERY_BY_TIER[tier]));
      }
    }

    const summary = TIERS.flatMap((tier) => (["2H", "1H+shield"] as const).map((profile) => {
      const target = rows.find((row) => row.tier === tier && row.profile === profile && row.enchantment === 3 && row.mastery === TARGET_MASTERY_BY_TIER[tier]);
      if (target === undefined) throw new Error(`Missing defensive audit row T${tier} ${profile}`);
      return {
        tier,
        profile,
        hp: target.hp,
        armor: target.rawArmor,
        mr: target.rawMr,
        physicalMitigationPct: target.physicalMitigationPct,
        magicalMitigationPct: target.magicalMitigationPct,
        damageTakenPhysical: target.physicalDamageFrom100,
        damageTakenMagical: target.magicalDamageFrom100,
        armorPlus10GainPct: target.armorPlus10MitigationGainPct,
        mrPlus10GainPct: target.mrPlus10MitigationGainPct,
      };
    }));

    console.table(summary);
    console.table(rows);
    console.log("[DEFENSIVE_MITIGATION_CHAIN_ROWS]", JSON.stringify(rows, null, 2));

    expect(rows).toHaveLength(TIERS.length * 2 * 3);
    expect(rows.every((row) => Number.isFinite(row.physicalDamageFrom100) && Number.isFinite(row.magicalDamageFrom100))).toBe(true);
    expect(rows.every((row) => row.armorPlus10MitigationGainPct > 0 && row.mrPlus10MitigationGainPct > 0)).toBe(true);
  });
});

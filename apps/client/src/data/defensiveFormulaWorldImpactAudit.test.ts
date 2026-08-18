import { describe, expect, it } from "vitest";
import { runCombatRuntimeBenchmark } from "../runtime/CombatRuntimeBenchmarkHarness.js";
import { WORLD_ZONE_IDS, type WorldZoneKey } from "./worldContentCatalog.js";

const TIERS = [4, 5, 6, 7, 8] as const;
type Tier = (typeof TIERS)[number];

type Profile = "2H" | "1H+shield";

const TARGET_MASTERY_BY_TIER = { 4: 20, 5: 35, 6: 45, 7: 55, 8: 65 } as const satisfies Readonly<Record<Tier, number>>;
const FINAL_ZONE_BY_TIER = {
  4: "mountain",
  5: "ironveil",
  6: "ashenpeak",
  7: "doompeak",
  8: "blackspire",
} as const satisfies Readonly<Record<Tier, WorldZoneKey>>;
const FINAL_SEGMENT_INDEX_BY_TIER = { 4: 9, 5: 4, 6: 4, 7: 4, 8: 4 } as const satisfies Readonly<Record<Tier, number>>;

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

function weaponFor(tier: Tier, profile: Profile): string {
  return profile === "1H+shield" ? ONE_HANDED_WEAPON_BY_TIER[tier] : TWO_HANDED_WEAPON_BY_TIER[tier];
}

function equipmentFor(tier: Tier, profile: Profile): readonly string[] {
  return profile === "1H+shield"
    ? [...ARMOR_BY_TIER[tier], SHIELD_BY_TIER[tier]]
    : ARMOR_BY_TIER[tier];
}

type Row = {
  readonly tier: Tier;
  readonly profile: Profile;
  readonly enchantment: 0 | 3;
  readonly clear: boolean;
  readonly seconds: number;
  readonly hpPercent: number;
  readonly encounterReached: number;
  readonly hp: number;
  readonly armor: number;
  readonly mr: number;
  readonly damageDealt: number;
  readonly damageReceived: number;
  readonly observedDps: number;
  readonly potionsUsed: number;
};

function run(tier: Tier, profile: Profile, enchantment: 0 | 3): Row {
  const result = runCombatRuntimeBenchmark({
    label: `def_formula_world_t${tier}_${profile}_e${enchantment}`,
    weaponItemId: weaponFor(tier, profile),
    zoneDefId: WORLD_ZONE_IDS[FINAL_ZONE_BY_TIER[tier]],
    segmentIndex: FINAL_SEGMENT_INDEX_BY_TIER[tier],
    equipmentItemIds: equipmentFor(tier, profile),
    enchantment,
    masteryLevel: TARGET_MASTERY_BY_TIER[tier],
    useHealthPotions: true,
  });

  return {
    tier,
    profile,
    enchantment,
    clear: result.clear,
    seconds: result.seconds,
    hpPercent: result.hpPercent,
    encounterReached: result.encounterReached,
    hp: result.maxHealth,
    armor: result.armor,
    mr: result.magicResistance,
    damageDealt: result.damageDealt,
    damageReceived: result.damageReceived,
    observedDps: result.observedDps,
    potionsUsed: result.potionsUsed,
  };
}

function pctChange(after: number, before: number): number | null {
  if (before === 0) return null;
  return Number((((after / before) - 1) * 100).toFixed(1));
}

/**
 * Diagnostic only.
 * Measures live world-combat consequences of the new diminishing-resistance mitigation formula.
 * No balance threshold is asserted here: this output is meant to reveal progression anomalies before tuning.
 */
describe("defensive formula world impact audit", () => {
  it("prints T4-T8 clear time, survivability, 2H/shield gap and enchantment impact", () => {
    const rows = TIERS.flatMap((tier) => (["2H", "1H+shield"] as const).flatMap((profile) => [
      run(tier, profile, 0),
      run(tier, profile, 3),
    ]));

    const summary = TIERS.flatMap((tier) => (["2H", "1H+shield"] as const).map((profile) => {
      const base = rows.find((row) => row.tier === tier && row.profile === profile && row.enchantment === 0);
      const enchanted = rows.find((row) => row.tier === tier && row.profile === profile && row.enchantment === 3);
      if (base === undefined || enchanted === undefined) throw new Error(`Missing audit rows T${tier} ${profile}`);
      return {
        tier,
        profile,
        baseClear: base.clear,
        baseSeconds: base.seconds,
        baseHpPct: base.hpPercent,
        baseDamageReceived: base.damageReceived,
        enchantedClear: enchanted.clear,
        enchantedSeconds: enchanted.seconds,
        enchantedHpPct: enchanted.hpPercent,
        enchantedDamageReceived: enchanted.damageReceived,
        enchantClearTimeDeltaPct: pctChange(enchanted.seconds, base.seconds),
        enchantDamageReceivedDeltaPct: pctChange(enchanted.damageReceived, base.damageReceived),
        enchantedArmor: enchanted.armor,
        enchantedMr: enchanted.mr,
        enchantedPotionsUsed: enchanted.potionsUsed,
      };
    }));

    const shieldVs2H = TIERS.map((tier) => {
      const twoHand = rows.find((row) => row.tier === tier && row.profile === "2H" && row.enchantment === 3);
      const shield = rows.find((row) => row.tier === tier && row.profile === "1H+shield" && row.enchantment === 3);
      if (twoHand === undefined || shield === undefined) throw new Error(`Missing shield comparison T${tier}`);
      return {
        tier,
        twoHandClear: twoHand.clear,
        shieldClear: shield.clear,
        twoHandSeconds: twoHand.seconds,
        shieldSeconds: shield.seconds,
        shieldClearTimeDeltaPct: pctChange(shield.seconds, twoHand.seconds),
        twoHandHpPct: twoHand.hpPercent,
        shieldHpPct: shield.hpPercent,
        twoHandDamageReceived: twoHand.damageReceived,
        shieldDamageReceived: shield.damageReceived,
        shieldDamageReceivedDeltaPct: pctChange(shield.damageReceived, twoHand.damageReceived),
        twoHandObservedDps: twoHand.observedDps,
        shieldObservedDps: shield.observedDps,
      };
    });

    console.table(summary);
    console.table(shieldVs2H);
    console.log("[DEFENSIVE_FORMULA_WORLD_IMPACT_ROWS]", JSON.stringify(rows, null, 2));
    console.log("[DEFENSIVE_FORMULA_WORLD_IMPACT_SUMMARY]", JSON.stringify(summary, null, 2));
    console.log("[DEFENSIVE_FORMULA_WORLD_IMPACT_SHIELD_VS_2H]", JSON.stringify(shieldVs2H, null, 2));

    expect(rows).toHaveLength(TIERS.length * 2 * 2);
    expect(rows.every((row) => Number.isFinite(row.seconds) && Number.isFinite(row.hpPercent))).toBe(true);
  });
});

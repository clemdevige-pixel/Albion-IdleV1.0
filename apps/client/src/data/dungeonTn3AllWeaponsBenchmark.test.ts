import { describe, expect, it } from "vitest";
import { DUNGEON_DEFINITIONS } from "./dungeonContentCatalog.js";
import { WORLD_ZONE_IDS } from "./worldContentCatalog.js";
import {
  runCombatRuntimeBenchmark,
  type CombatRuntimeAbilityTelemetry,
  type CombatRuntimeBenchmarkDamageTuning,
  type CombatRuntimeDamageSourceTelemetry,
} from "../runtime/CombatRuntimeBenchmarkHarness.js";

type Tier = 4 | 5 | 6 | 7 | 8;
type WeaponFamily = "broadsword" | "longbow" | "infernal" | "spiked" | "dual_dagger";
type CapeMode = "none" | "faction";

type BenchmarkMode = {
  readonly cape: CapeMode;
  readonly potion: boolean;
};

const TIERS: readonly Tier[] = [4, 5, 6, 7, 8];
const FAMILIES: readonly WeaponFamily[] = ["broadsword", "longbow", "infernal", "spiked", "dual_dagger"];
const BENCHMARK_MODES: readonly BenchmarkMode[] = [
  { cape: "none", potion: false },
  { cape: "none", potion: true },
  { cape: "faction", potion: false },
  { cape: "faction", potion: true },
];

const EXPECTED_CAPE_REDUCTION_BY_TIER: Readonly<Record<Tier, number>> = {
  4: 6,
  5: 8,
  6: 11,
  7: 14,
  8: 18,
};

const MASTERY_BY_TIER: Readonly<Record<Tier, number>> = {
  4: 22,
  5: 35,
  6: 45,
  7: 55,
  8: 65,
};

const ZONE_BY_TIER = {
  4: WORLD_ZONE_IDS.mountain,
  5: WORLD_ZONE_IDS.ironveil,
  6: WORLD_ZONE_IDS.ashenpeak,
  7: WORLD_ZONE_IDS.doompeak,
  8: WORLD_ZONE_IDS.blackspire,
} as const;

function weaponId(tier: Tier, family: WeaponFamily): string {
  if (family === "broadsword") return `item_weapon_sword_t${tier}_broadsword`;
  if (family === "longbow") return `item_weapon_bow_t${tier}_longbow`;
  if (family === "infernal") return `item_weapon_staff_t${tier}_infernal`;
  if (family === "spiked") return `item_weapon_gloves_t${tier}_spiked_gauntlets`;
  return `item_weapon_dagger_t${tier}_pair`;
}

function armorIds(
  tier: Tier,
  family: WeaponFamily,
  faction: string,
  capeMode: CapeMode,
): readonly string[] {
  const base = [
    `item_helmet_t${tier}_reinforced`,
    `item_armor_t${tier}_leather`,
    `item_boots_t${tier}_leather`,
  ];
  const withCape = capeMode === "faction"
    ? [...base, `item_cape_t${tier}_${faction.toLowerCase()}`]
    : base;
  return family === "broadsword"
    ? [...withCape, `item_shield_t${tier}_reinforced`]
    : withCape;
}

function benchmarkDamageTuning(family: WeaponFamily): CombatRuntimeBenchmarkDamageTuning | undefined {
  if (family === "longbow") {
    return { autoAttackMultiplier: 0.89 };
  }
  if (family === "infernal") {
    return {
      directAbilityMultiplierById: { ability_fire_cataclysm: 1.1 },
      effectDamageMultiplier: 1.5,
    };
  }
  if (family === "dual_dagger") {
    return {
      directAbilityMultiplierById: {
        ability_dagger_double_slash: 1.08,
        ability_dagger_flurry: 1.08,
      },
    };
  }
  return undefined;
}

const round1 = (value: number): number => Number(value.toFixed(1));
const modeLabel = (mode: BenchmarkMode): string => `${mode.cape}:${mode.potion ? "potion" : "no-potion"}`;

type BenchmarkRow = {
  tier: Tier;
  faction: string;
  dungeon: string;
  weapon: WeaponFamily;
  cape: CapeMode;
  potion: boolean;
  mastery: number;
  capeReductionPct: number;
  armor: number;
  magicResistance: number;
  clear: boolean;
  encounterReached: number;
  encounterProgressPct: number;
  bossProgressPct: number;
  enemyHpRemainingPct: number;
  seconds: number;
  hpPercent: number;
  potionsUsed: number;
  observedDps: number;
  incomingDps: number;
  damageDealt: number;
  damageReceived: number;
  damageBySource: CombatRuntimeDamageSourceTelemetry;
  abilities: readonly CombatRuntimeAbilityTelemetry[];
};

function aggregateAbility(rows: readonly BenchmarkRow[], slotIndex: number): {
  readonly abilityId: string;
  readonly damage: number;
  readonly dotDamage: number;
  readonly casts: number;
} {
  let abilityId = "-";
  let damage = 0;
  let dotDamage = 0;
  let casts = 0;
  for (const row of rows) {
    const ability = row.abilities[slotIndex];
    if (ability === undefined) continue;
    abilityId = ability.abilityId;
    damage += ability.totalDamage;
    dotDamage += ability.dotDamage;
    casts += ability.casts;
  }
  return { abilityId, damage, dotDamage, casts };
}

describe("same-tier .3 dungeon benchmark across all weapons, faction capes and potions", () => {
  it("compares no cape and matching faction cape with and without health potions", () => {
    const rows: BenchmarkRow[] = [];

    for (const tier of TIERS) {
      const dungeons = DUNGEON_DEFINITIONS.filter((dungeon) => dungeon.tier === tier);
      for (const dungeon of dungeons) {
        for (const family of FAMILIES) {
          for (const mode of BENCHMARK_MODES) {
            const damageTuning = benchmarkDamageTuning(family);
            const result = runCombatRuntimeBenchmark({
              label: `${dungeon.id}:${family}:${modeLabel(mode)}:t${tier}.3`,
              weaponItemId: weaponId(tier, family),
              equipmentItemIds: armorIds(tier, family, dungeon.faction, mode.cape),
              zoneDefId: ZONE_BY_TIER[tier],
              segmentIndex: 9,
              dungeonDefinitionId: dungeon.id,
              enchantment: 3,
              masteryLevel: MASTERY_BY_TIER[tier],
              useHealthPotions: mode.potion,
              ...(damageTuning === undefined ? {} : { damageTuning }),
            });

            rows.push({
              tier,
              faction: dungeon.faction,
              dungeon: dungeon.id,
              weapon: family,
              cape: mode.cape,
              potion: mode.potion,
              mastery: MASTERY_BY_TIER[tier],
              capeReductionPct: result.dungeonDamageReductionPercent,
              armor: result.armor,
              magicResistance: result.magicResistance,
              clear: result.clear,
              encounterReached: result.encounterReached,
              encounterProgressPct: result.encounterProgressPercent,
              bossProgressPct: result.bossProgressPercent,
              enemyHpRemainingPct: result.enemyHpRemainingPercent,
              seconds: result.seconds,
              hpPercent: result.hpPercent,
              potionsUsed: result.potionsUsed,
              observedDps: result.observedDps,
              incomingDps: result.incomingDps,
              damageDealt: result.damageDealt,
              damageReceived: result.damageReceived,
              damageBySource: result.damageBySource,
              abilities: result.abilities,
            });
          }
        }
      }
    }

    const tierModeSummary = TIERS.flatMap((tier) => BENCHMARK_MODES.map((mode) => {
      const tierRows = rows.filter((row) => (
        row.tier === tier && row.cape === mode.cape && row.potion === mode.potion
      ));
      const cleared = tierRows.filter((row) => row.clear);
      return {
        tier,
        cape: mode.cape,
        potion: mode.potion,
        runs: tierRows.length,
        clears: cleared.length,
        clearRatePct: round1((cleared.length / tierRows.length) * 100),
        avgEncounterReached: round1(
          tierRows.reduce((sum, row) => sum + row.encounterReached, 0) / tierRows.length,
        ),
        avgEncounterProgressPct: round1(
          tierRows.reduce((sum, row) => sum + row.encounterProgressPct, 0) / tierRows.length,
        ),
        avgBossProgressPct: round1(
          tierRows.reduce((sum, row) => sum + row.bossProgressPct, 0) / tierRows.length,
        ),
        avgIncomingDps: round1(
          tierRows.reduce((sum, row) => sum + row.incomingDps, 0) / tierRows.length,
        ),
        avgPotionsUsed: round1(
          tierRows.reduce((sum, row) => sum + row.potionsUsed, 0) / tierRows.length,
        ),
        avgClearSeconds: cleared.length > 0
          ? round1(cleared.reduce((sum, row) => sum + row.seconds, 0) / cleared.length)
          : 0,
        avgClearHpPct: cleared.length > 0
          ? round1(cleared.reduce((sum, row) => sum + row.hpPercent, 0) / cleared.length)
          : 0,
        capeReductionPct: round1(
          tierRows.reduce((sum, row) => sum + row.capeReductionPct, 0) / tierRows.length,
        ),
      };
    }));

    const capeImpact = TIERS.flatMap((tier) => [false, true].map((potion) => {
      const noCape = rows.filter((row) => row.tier === tier && row.cape === "none" && row.potion === potion);
      const faction = rows.filter((row) => row.tier === tier && row.cape === "faction" && row.potion === potion);
      const noCapeClears = noCape.filter((row) => row.clear);
      const factionClears = faction.filter((row) => row.clear);
      const avgNoCapeIncomingDps = noCape.reduce((sum, row) => sum + row.incomingDps, 0) / noCape.length;
      const avgFactionIncomingDps = faction.reduce((sum, row) => sum + row.incomingDps, 0) / faction.length;
      const avgNoCapeBossProgress = noCape.reduce((sum, row) => sum + row.bossProgressPct, 0) / noCape.length;
      const avgFactionBossProgress = faction.reduce((sum, row) => sum + row.bossProgressPct, 0) / faction.length;
      return {
        tier,
        potion,
        noCapeClears: `${noCapeClears.length}/${noCape.length}`,
        factionClears: `${factionClears.length}/${faction.length}`,
        clearRateDeltaPct: round1(
          ((factionClears.length / faction.length) - (noCapeClears.length / noCape.length)) * 100,
        ),
        avgIncomingDpsNoCape: round1(avgNoCapeIncomingDps),
        avgIncomingDpsFaction: round1(avgFactionIncomingDps),
        incomingDpsReductionPct: avgNoCapeIncomingDps > 0
          ? round1((1 - avgFactionIncomingDps / avgNoCapeIncomingDps) * 100)
          : 0,
        avgBossProgressNoCape: round1(avgNoCapeBossProgress),
        avgBossProgressFaction: round1(avgFactionBossProgress),
        bossProgressDeltaPct: round1(avgFactionBossProgress - avgNoCapeBossProgress),
      };
    }));

    const damageBreakdown = TIERS.flatMap((tier) => FAMILIES.map((weapon) => {
      const weaponRows = rows.filter((row) => (
        row.tier === tier
        && row.weapon === weapon
        && row.cape === "faction"
        && row.potion
      ));
      const totalSeconds = weaponRows.reduce((sum, row) => sum + row.seconds, 0);
      const totalDamage = weaponRows.reduce((sum, row) => sum + row.damageDealt, 0);
      const aaDamage = weaponRows.reduce((sum, row) => sum + row.damageBySource.autoAttack, 0);
      const s1 = aggregateAbility(weaponRows, 0);
      const s2 = aggregateAbility(weaponRows, 1);
      const s3 = aggregateAbility(weaponRows, 2);
      const dps = (damage: number): number => totalSeconds > 0 ? round1(damage / totalSeconds) : 0;
      const share = (damage: number): number => totalDamage > 0 ? round1((damage / totalDamage) * 100) : 0;
      const perCast = (damage: number, casts: number): number => casts > 0 ? round1(damage / casts) : 0;
      const dotShare = (ability: typeof s1): number => ability.damage > 0
        ? round1((ability.dotDamage / ability.damage) * 100)
        : 0;
      return {
        tier,
        weapon,
        clears: `${weaponRows.filter((row) => row.clear).length}/${weaponRows.length}`,
        totalDps: dps(totalDamage),
        aaDps: dps(aaDamage),
        aaPct: share(aaDamage),
        s1: s1.abilityId,
        s1Dps: dps(s1.damage),
        s1Pct: share(s1.damage),
        s1DotPct: dotShare(s1),
        s1Casts: s1.casts,
        s1DmgCast: perCast(s1.damage, s1.casts),
        s2: s2.abilityId,
        s2Dps: dps(s2.damage),
        s2Pct: share(s2.damage),
        s2DotPct: dotShare(s2),
        s2Casts: s2.casts,
        s2DmgCast: perCast(s2.damage, s2.casts),
        s3: s3.abilityId,
        s3Dps: dps(s3.damage),
        s3Pct: share(s3.damage),
        s3DotPct: dotShare(s3),
        s3Casts: s3.casts,
        s3DmgCast: perCast(s3.damage, s3.casts),
      };
    }));

    console.log("[DUNGEON_TN3_TIER_MODE_SUMMARY]");
    console.table(tierModeSummary);
    console.log("[DUNGEON_TN3_FACTION_CAPE_IMPACT]");
    console.table(capeImpact);
    console.log("[DUNGEON_TN3_DAMAGE_BREAKDOWN]");
    console.table(damageBreakdown);

    expect(rows).toHaveLength(DUNGEON_DEFINITIONS.length * FAMILIES.length * BENCHMARK_MODES.length);
    expect(rows.every((row) => (
      Number.isFinite(row.seconds)
      && Number.isFinite(row.observedDps)
      && Number.isFinite(row.incomingDps)
      && row.encounterProgressPct >= 0
      && row.encounterProgressPct <= 100
      && row.bossProgressPct >= 0
      && row.bossProgressPct <= 100
      && row.abilities.every((ability) => (
        ability.directDamage >= 0
        && ability.dotDamage >= 0
        && Math.abs(ability.totalDamage - (ability.directDamage + ability.dotDamage)) <= 0.11
      ))
    ))).toBe(true);

    expect(rows.filter((row) => row.cape === "none").every((row) => row.capeReductionPct === 0)).toBe(true);
    for (const tier of TIERS) {
      expect(
        rows
          .filter((row) => row.tier === tier && row.cape === "faction")
          .every((row) => row.capeReductionPct === EXPECTED_CAPE_REDUCTION_BY_TIER[tier]),
      ).toBe(true);
    }
    expect(rows.filter((row) => !row.potion).every((row) => row.potionsUsed === 0)).toBe(true);
  });
});

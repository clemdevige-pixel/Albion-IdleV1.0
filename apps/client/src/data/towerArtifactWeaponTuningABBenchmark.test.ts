import { describe, expect, it, vi } from "vitest";
import type { AuthoredEnemyCombatProfile } from "../runtime/combatEntityFactory.js";

interface DungeonCombatProfileInput {
  readonly dungeonDefinitionId: string;
  readonly encounterIndex: number;
  readonly monsterDefinitionId: string;
}

interface DungeonContentMockSurface {
  readonly getDungeonDefinition: (dungeonDefinitionId: string) => {
    readonly faction: string;
    readonly tier: number;
  };
  readonly resolveDungeonCombatProfile: (
    input: DungeonCombatProfileInput,
  ) => AuthoredEnemyCombatProfile;
  readonly [key: string]: unknown;
}

vi.mock("./dungeonContentCatalog.js", async (importOriginal) => {
  const actual = await importOriginal<DungeonContentMockSurface>();
  const { applyTowerFactionCombatNormalization } = await import("./towerCombatNormalization.js");

  return {
    ...actual,
    resolveDungeonCombatProfile: (input: DungeonCombatProfileInput) => {
      const profile = actual.resolveDungeonCombatProfile(input);
      const dungeon = actual.getDungeonDefinition(input.dungeonDefinitionId);
      const factionId = dungeon.faction.toLowerCase();
      if (
        factionId !== "keeper"
        && factionId !== "heretic"
        && factionId !== "undead"
        && factionId !== "morgana"
      ) return profile;
      if (
        dungeon.tier !== 4
        && dungeon.tier !== 5
        && dungeon.tier !== 6
        && dungeon.tier !== 7
        && dungeon.tier !== 8
      ) return profile;

      return applyTowerFactionCombatNormalization(
        { factionId, tier: dungeon.tier },
        profile,
      );
    },
  };
});

import {
  ARTIFACT_WEAPON_BENCHMARK_SPECS,
  artifactDungeonEquipment,
  type ArtifactBenchmarkTier,
} from "./artifactWeaponBenchmarkFixtures.js";
import { DUNGEON_DEFINITIONS } from "./dungeonContentCatalog.js";
import { resolveFactionCombatModifiers } from "./factionCombatResolver.js";
import { resolveArtifactDungeonDamageBonusPercent } from "./weaponContentCatalog.js";
import { WORLD_ZONE_IDS } from "./worldContentCatalog.js";
import { runCombatRuntimeBenchmark } from "../runtime/CombatRuntimeBenchmarkHarness.js";

const POTION_CAP = 2;
const ENDGAME_FAMILY_MASTERY = 75;
const ENDGAME_WEAPON_MASTERY = 45;
const ENDGAME_SIBLING_MASTERY = 45;
const BENCHMARK_TIERS = [4, 5, 6, 7, 8] as const satisfies readonly ArtifactBenchmarkTier[];

const TUNING_CANDIDATES = [
  {
    weapon: "Bow of Badon",
    abilityId: "ability_bow_badon_raging_storm",
    currentSignatureRatio: 1.35,
    candidateSignatureRatio: 1.2,
    directDamageMultiplier: 1.2 / 1.35,
    note: "Direct signature damage only; stun remains authored and unchanged.",
  },
  {
    weapon: "Brimstone Staff",
    abilityId: "ability_fire_brimstone_meteor",
    currentSignatureRatio: 2,
    candidateSignatureRatio: 1.85,
    directDamageMultiplier: 1.85 / 2,
    note: "Direct signature damage only; cooldown and all other weapon data remain authored.",
  },
  {
    weapon: "Deathgivers",
    abilityId: "ability_dagger_deathgivers_ghost_strike",
    currentSignatureRatio: 2.7,
    candidateSignatureRatio: 2.9,
    directDamageMultiplier: 2.9 / 2.7,
    note: "Benchmark proxy for the common Opening-active cast: authored 1.8 + 0.9 becomes proposed 2.0 + 0.9. This avoids multiplying the conditional 0.9 as if it were also buffed.",
  },
] as const;

function round1(value: number): number {
  return Number(value.toFixed(1));
}

function runCandidateTier(
  candidate: (typeof TUNING_CANDIDATES)[number],
  tier: ArtifactBenchmarkTier,
) {
  const weapon = ARTIFACT_WEAPON_BENCHMARK_SPECS.find((entry) => entry.label === candidate.weapon);
  if (weapon === undefined) throw new Error(`Missing benchmark weapon ${candidate.weapon}`);

  const weaponItemId = weapon.itemId(tier);
  const favorableDungeons = DUNGEON_DEFINITIONS.filter((dungeon) => (
    dungeon.tier === tier
    && resolveArtifactDungeonDamageBonusPercent(weaponItemId, dungeon.faction) > 0
  ));
  if (favorableDungeons.length !== 1) {
    throw new Error(
      `Expected one favorable T${String(tier)} dungeon for ${candidate.weapon}, found ${String(favorableDungeons.length)}`,
    );
  }

  const dungeon = favorableDungeons[0]!;
  const factionId = dungeon.faction.toLowerCase();
  if (
    factionId !== "keeper"
    && factionId !== "heretic"
    && factionId !== "undead"
    && factionId !== "morgana"
  ) throw new Error(`Unsupported Tower faction ${dungeon.faction}`);

  const capeItemId = `item_cape_t${String(tier)}_${factionId}`;
  const modifiers = resolveFactionCombatModifiers(
    { weaponItemId, capeItemId },
    { factionId, tier, activity: "tower" },
  );
  const heroDamageMultiplier = (
    (1 + modifiers.outgoingDamageBonusPercent / 100)
    * modifiers.factionResilienceDamageMultiplier
  );
  const common = {
    weaponItemId,
    equipmentItemIds: artifactDungeonEquipment(weaponItemId, tier, dungeon.faction),
    zoneDefId: WORLD_ZONE_IDS.mountain,
    segmentIndex: 9,
    dungeonDefinitionId: dungeon.id,
    enchantment: 3,
    familyMasteryLevel: ENDGAME_FAMILY_MASTERY,
    specializationMasteryLevel: ENDGAME_WEAPON_MASTERY,
    siblingSpecializationMasteryLevel: ENDGAME_SIBLING_MASTERY,
    heroDamageMultiplier,
    useHealthPotions: true,
    healthPotionQuantity: POTION_CAP,
  } as const;

  const baseline = runCombatRuntimeBenchmark({
    ...common,
    label: `tower_tuning_ab_baseline_${candidate.weapon.replaceAll(" ", "_").toLowerCase()}_t${String(tier)}`,
  });
  const tuned = runCombatRuntimeBenchmark({
    ...common,
    label: `tower_tuning_ab_candidate_${candidate.weapon.replaceAll(" ", "_").toLowerCase()}_t${String(tier)}`,
    damageTuning: {
      directAbilityMultiplierById: {
        [candidate.abilityId]: candidate.directDamageMultiplier,
      },
    },
  });

  const baselineAbility = baseline.abilities.find((ability) => ability.abilityId === candidate.abilityId);
  const tunedAbility = tuned.abilities.find((ability) => ability.abilityId === candidate.abilityId);

  return {
    weapon: candidate.weapon,
    tier,
    faction: factionId,
    abilityId: candidate.abilityId,
    currentRatio: candidate.currentSignatureRatio,
    candidateRatio: candidate.candidateSignatureRatio,
    baselineClear: baseline.clear,
    candidateClear: tuned.clear,
    baselineHpPct: round1(baseline.hpPercent),
    candidateHpPct: round1(tuned.hpPercent),
    hpDeltaPct: round1(tuned.hpPercent - baseline.hpPercent),
    baselineDps: round1(baseline.observedDps),
    candidateDps: round1(tuned.observedDps),
    dpsDeltaPct: baseline.observedDps > 0
      ? round1(((tuned.observedDps / baseline.observedDps) - 1) * 100)
      : 0,
    baselineSeconds: round1(baseline.seconds),
    candidateSeconds: round1(tuned.seconds),
    secondsDelta: round1(tuned.seconds - baseline.seconds),
    baselineSignatureDamage: round1(baselineAbility?.directDamage ?? 0),
    candidateSignatureDamage: round1(tunedAbility?.directDamage ?? 0),
    baselineSignatureCasts: baselineAbility?.casts ?? 0,
    candidateSignatureCasts: tunedAbility?.casts ?? 0,
  };
}

type ABRow = ReturnType<typeof runCandidateTier>;

function summarize(rows: readonly ABRow[]) {
  return TUNING_CANDIDATES.map((candidate) => {
    const weaponRows = rows.filter((row) => row.weapon === candidate.weapon);
    return {
      weapon: candidate.weapon,
      currentRatio: candidate.currentSignatureRatio,
      candidateRatio: candidate.candidateSignatureRatio,
      runs: weaponRows.length,
      baselineClears: weaponRows.filter((row) => row.baselineClear).length,
      candidateClears: weaponRows.filter((row) => row.candidateClear).length,
      avgBaselineHpPct: round1(
        weaponRows.reduce((sum, row) => sum + row.baselineHpPct, 0) / weaponRows.length,
      ),
      avgCandidateHpPct: round1(
        weaponRows.reduce((sum, row) => sum + row.candidateHpPct, 0) / weaponRows.length,
      ),
      avgBaselineDps: round1(
        weaponRows.reduce((sum, row) => sum + row.baselineDps, 0) / weaponRows.length,
      ),
      avgCandidateDps: round1(
        weaponRows.reduce((sum, row) => sum + row.candidateDps, 0) / weaponRows.length,
      ),
      avgDpsDeltaPct: round1(
        weaponRows.reduce((sum, row) => sum + row.dpsDeltaPct, 0) / weaponRows.length,
      ),
      avgBaselineSeconds: round1(
        weaponRows.reduce((sum, row) => sum + row.baselineSeconds, 0) / weaponRows.length,
      ),
      avgCandidateSeconds: round1(
        weaponRows.reduce((sum, row) => sum + row.candidateSeconds, 0) / weaponRows.length,
      ),
    };
  });
}

describe("Tower artifact weapon tuning A/B benchmark", () => {
  it("compares candidate signature tuning without changing authored weapon data", () => {
    const rows = TUNING_CANDIDATES.flatMap((candidate) => (
      BENCHMARK_TIERS.map((tier) => runCandidateTier(candidate, tier))
    ));
    const summary = summarize(rows);

    console.log("[TOWER_ARTIFACT_WEAPON_TUNING_AB_ALL_TIERS]");
    console.table(rows);
    console.log("[TOWER_ARTIFACT_WEAPON_TUNING_AB_SUMMARY]");
    console.table(summary);
    console.log("[TOWER_ARTIFACT_WEAPON_TUNING_AB_CANDIDATES]");
    console.table(TUNING_CANDIDATES);
    console.log("[TOWER_ARTIFACT_WEAPON_TUNING_AB_NOTE] Tower normalization and the full favorable faction package are live in both arms. Candidate changes use the existing benchmark-only direct ability damage hook; authored weapon values are untouched. Deathgivers uses a 2.7→2.9 Opening-active proxy so its authored +0.9 conditional bonus is not treated as if it were also being buffed.");

    expect(rows).toHaveLength(TUNING_CANDIDATES.length * BENCHMARK_TIERS.length);
    expect(summary.every((row) => row.runs === BENCHMARK_TIERS.length)).toBe(true);
    expect(rows.every((row) => row.baselineSignatureCasts > 0)).toBe(true);
    expect(rows.every((row) => row.candidateSignatureCasts > 0)).toBe(true);
  });
});

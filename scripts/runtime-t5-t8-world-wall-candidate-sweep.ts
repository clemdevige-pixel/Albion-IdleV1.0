import {
  BLACK_WORLD_COMBAT_CURVE,
  ORANGE_WORLD_COMBAT_CURVE,
  RED_WORLD_COMBAT_CURVE,
  YELLOW_WORLD_COMBAT_CURVE,
  type ZoneCombatCurve,
} from "@game/data";
import { resolveEquipmentInfo } from "../apps/client/src/data/itemContentCatalog.js";
import {
  WORLD_ZONE_IDS_BY_BAND,
  ZONE_DEFINITIONS,
} from "../apps/client/src/data/worldContentCatalog.js";
import { runCombatRuntimeBenchmark } from "../apps/client/src/runtime/CombatRuntimeBenchmarkHarness.js";

type Tier = 4 | 5 | 6 | 7 | 8;
type TargetTier = 5 | 6 | 7 | 8;
type Enchantment = 0 | 1 | 2 | 3;
type BandId = "yellow" | "orange" | "red" | "black";

type MutableZoneCombatCurve = {
  healthStart: number;
  healthEnd: number;
  damageStart: number;
  damageEnd: number;
  defenseStart: number;
  defenseEnd: number;
  defenseModel: ZoneCombatCurve["defenseModel"];
  bossGate?: ZoneCombatCurve["bossGate"];
};

interface ZoneExpectation {
  readonly gearTier: TargetTier;
  readonly enchantment: Enchantment;
  readonly masteryLevel: number;
}

interface CandidateScale {
  readonly health: number;
  readonly damage: number;
  readonly defense: number;
  readonly score: number;
}

interface CandidateResult extends CandidateScale {
  readonly tier: TargetTier;
  readonly band: BandId;
  readonly zoneIndex: number;
  readonly zone: string;
  readonly segment: string;
  readonly expectedGear: string;
  readonly expectedPotionClears: number;
  readonly expectedMinHp: number;
  readonly undergearPotionClears: number;
  readonly undergearRuns: number;
  readonly valid: boolean;
}

const WEAPON_FAMILIES = [
  ["sword", "broadsword"],
  ["bow", "longbow"],
  ["staff", "infernal"],
  ["gloves", "spiked_gauntlets"],
  ["dagger", "pair"],
] as const;

const TIER_CONFIG: Readonly<Record<TargetTier, { readonly band: BandId; readonly curve: readonly ZoneCombatCurve[] }>> = {
  5: { band: "yellow", curve: YELLOW_WORLD_COMBAT_CURVE },
  6: { band: "orange", curve: ORANGE_WORLD_COMBAT_CURVE },
  7: { band: "red", curve: RED_WORLD_COMBAT_CURVE },
  8: { band: "black", curve: BLACK_WORLD_COMBAT_CURVE },
};

const TARGET_TIERS = [5, 6, 7, 8] as const satisfies readonly TargetTier[];
const HEALTH_SCALES = [1, 1.05, 1.1, 1.15, 1.2, 1.25, 1.3, 1.4, 1.5, 1.6] as const;
const DAMAGE_SCALES = [1, 1.05, 1.1, 1.15, 1.2, 1.25, 1.3, 1.4, 1.5, 1.6] as const;
const DEFENSE_SCALES = [1, 1.05, 1.1, 1.15, 1.2, 1.25, 1.3] as const;
const MIN_EXPECTED_POTION_CLEARS = 2;
const MAX_VALID_CANDIDATES_PER_ZONE = 8;

function weaponItemIds(tier: Tier): readonly string[] {
  return WEAPON_FAMILIES.map(([family, specialization]) =>
    `item_weapon_${family}_t${String(tier)}_${specialization}`,
  );
}

function armorItemIds(tier: Tier): readonly string[] {
  return [
    `item_helmet_t${String(tier)}_reinforced`,
    `item_armor_t${String(tier)}_leather`,
    `item_boots_t${String(tier)}_leather`,
    "item_traveler_cape",
  ];
}

function equipmentFor(weaponItemId: string, tier: Tier): readonly string[] {
  const items = [...armorItemIds(tier)];
  if (resolveEquipmentInfo(weaponItemId)?.handling === "one_handed") {
    items.push(`item_shield_t${String(tier)}_reinforced`);
  }
  return items;
}

function zoneName(zoneDefId: string): string {
  return ZONE_DEFINITIONS.find(({ id }) => String(id) === zoneDefId)?.name ?? zoneDefId;
}

function masteryBaseForTier(tier: TargetTier): number {
  return 25 + (tier - 5) * 15;
}

function expectedLoadoutForZone(tier: TargetTier, zoneIndex: number): ZoneExpectation {
  const base = masteryBaseForTier(tier);
  switch (zoneIndex) {
    case 0:
      return { gearTier: tier, enchantment: 0, masteryLevel: base };
    case 1:
      return { gearTier: tier, enchantment: 0, masteryLevel: base + 2 };
    case 2:
      return { gearTier: tier, enchantment: 1, masteryLevel: base + 4 };
    case 3:
      return { gearTier: tier, enchantment: 2, masteryLevel: base + 7 };
    case 4:
      return { gearTier: tier, enchantment: 2, masteryLevel: base + 10 };
    default:
      throw new Error(`Unexpected zone index ${String(zoneIndex)}`);
  }
}

function undergearCandidates(expected: ZoneExpectation): readonly { readonly tier: Tier; readonly enchantment: Enchantment }[] {
  const candidates: Array<{ tier: Tier; enchantment: Enchantment }> = [
    { tier: (expected.gearTier - 1) as Tier, enchantment: 3 },
  ];
  for (let enchantment = 0; enchantment < expected.enchantment; enchantment += 1) {
    candidates.push({ tier: expected.gearTier, enchantment: enchantment as Enchantment });
  }
  return candidates;
}

function candidateScales(): readonly CandidateScale[] {
  const candidates: CandidateScale[] = [];
  for (const health of HEALTH_SCALES) {
    for (const damage of DAMAGE_SCALES) {
      for (const defense of DEFENSE_SCALES) {
        candidates.push({
          health,
          damage,
          defense,
          score: Number(((health - 1) + (damage - 1) + (defense - 1)).toFixed(4)),
        });
      }
    }
  }
  return candidates.sort((a, b) =>
    a.score - b.score
    || a.health - b.health
    || a.damage - b.damage
    || a.defense - b.defense,
  );
}

function scaleZone(zone: MutableZoneCombatCurve, original: ZoneCombatCurve, candidate: CandidateScale): void {
  zone.healthStart = original.healthStart * candidate.health;
  zone.healthEnd = original.healthEnd * candidate.health;
  zone.damageStart = original.damageStart * candidate.damage;
  zone.damageEnd = original.damageEnd * candidate.damage;
  zone.defenseStart = original.defenseStart * candidate.defense;
  zone.defenseEnd = original.defenseEnd * candidate.defense;
}

function restoreZone(zone: MutableZoneCombatCurve, original: ZoneCombatCurve): void {
  zone.healthStart = original.healthStart;
  zone.healthEnd = original.healthEnd;
  zone.damageStart = original.damageStart;
  zone.damageEnd = original.damageEnd;
  zone.defenseStart = original.defenseStart;
  zone.defenseEnd = original.defenseEnd;
}

function runCandidate(
  tier: TargetTier,
  zoneIndex: number,
  candidate: CandidateScale,
): CandidateResult {
  const { band } = TIER_CONFIG[tier];
  const zoneDefId = WORLD_ZONE_IDS_BY_BAND[band][zoneIndex];
  if (zoneDefId === undefined) throw new Error(`Missing zone ${String(zoneIndex + 1)} for ${band}`);

  const expected = expectedLoadoutForZone(tier, zoneIndex);
  // Final zone S10 contains the separate bossGate. Calibrate normal world pressure on S9 first.
  const segmentIndex = zoneIndex === 4 ? 8 : 9;

  const expectedRuns = weaponItemIds(expected.gearTier).map((weaponItemId) =>
    runCombatRuntimeBenchmark({
      label: `wall_candidate_t${tier}_z${String(zoneIndex + 1)}_expected`,
      weaponItemId,
      zoneDefId,
      segmentIndex,
      equipmentItemIds: equipmentFor(weaponItemId, expected.gearTier),
      masteryLevel: expected.masteryLevel,
      enchantment: expected.enchantment,
      useHealthPotions: true,
    }),
  );

  const undergear = undergearCandidates(expected);
  let undergearPotionClears = 0;
  let undergearRuns = 0;
  for (const loadout of undergear) {
    for (const weaponItemId of weaponItemIds(loadout.tier)) {
      const result = runCombatRuntimeBenchmark({
        label: `wall_candidate_t${tier}_z${String(zoneIndex + 1)}_undergear`,
        weaponItemId,
        zoneDefId,
        segmentIndex,
        equipmentItemIds: equipmentFor(weaponItemId, loadout.tier),
        masteryLevel: expected.masteryLevel,
        enchantment: loadout.enchantment,
        useHealthPotions: true,
      });
      undergearRuns += 1;
      if (result.clear) undergearPotionClears += 1;
    }
  }

  const expectedClears = expectedRuns.filter((result) => result.clear);
  const expectedMinHp = expectedClears.length === 0
    ? 0
    : Math.min(...expectedClears.map((result) => result.hpPercent));

  return {
    tier,
    band,
    zoneIndex: zoneIndex + 1,
    zone: zoneName(String(zoneDefId)),
    segment: `S${String(segmentIndex + 1)}`,
    expectedGear: `T${String(expected.gearTier)}.${String(expected.enchantment)}`,
    ...candidate,
    expectedPotionClears: expectedClears.length,
    expectedMinHp,
    undergearPotionClears,
    undergearRuns,
    valid: undergearPotionClears === 0 && expectedClears.length >= MIN_EXPECTED_POTION_CLEARS,
  };
}

const scales = candidateScales();
const bestByZone: CandidateResult[] = [];

for (const tier of TARGET_TIERS) {
  const { curve } = TIER_CONFIG[tier];
  for (let zoneIndex = 0; zoneIndex < curve.length; zoneIndex += 1) {
    const readonlyZone = curve[zoneIndex];
    if (readonlyZone === undefined) continue;
    const zone = readonlyZone as MutableZoneCombatCurve;
    const original: ZoneCombatCurve = {
      healthStart: readonlyZone.healthStart,
      healthEnd: readonlyZone.healthEnd,
      damageStart: readonlyZone.damageStart,
      damageEnd: readonlyZone.damageEnd,
      defenseStart: readonlyZone.defenseStart,
      defenseEnd: readonlyZone.defenseEnd,
      defenseModel: readonlyZone.defenseModel,
      ...(readonlyZone.bossGate === undefined ? {} : { bossGate: readonlyZone.bossGate }),
    };

    const valid: CandidateResult[] = [];
    try {
      for (const candidate of scales) {
        scaleZone(zone, original, candidate);
        const result = runCandidate(tier, zoneIndex, candidate);
        if (result.valid) {
          valid.push(result);
          if (valid.length >= MAX_VALID_CANDIDATES_PER_ZONE) break;
        }
      }
    } finally {
      restoreZone(zone, original);
    }

    console.log(`[T${String(tier)}_Z${String(zoneIndex + 1)}_WALL_VALID_CANDIDATES]`);
    console.table(valid);
    console.log(
      `[T${String(tier)}_Z${String(zoneIndex + 1)}_WALL_VALID_CANDIDATES_JSON]`,
      JSON.stringify(valid, null, 2),
    );

    const best = valid[0];
    if (best !== undefined) bestByZone.push(best);
  }
}

console.log("[T5_T8_WORLD_WALL_BEST_CANDIDATES]");
console.table(bestByZone);
console.log("[T5_T8_WORLD_WALL_BEST_CANDIDATES_JSON]", JSON.stringify(bestByZone, null, 2));
console.log("[T5_T8_WORLD_WALL_SWEEP_CONTRACT]", {
  normalFinalZoneSegment: "S9",
  otherZoneSegment: "S10",
  undergearPotionClearsRequired: 0,
  minimumExpectedPotionClears: MIN_EXPECTED_POTION_CLEARS,
  note: "Boss-gate S10 is intentionally excluded from final-zone normal wall calibration.",
});

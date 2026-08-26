import { getWorldTierTransitionContract } from "@game/data";
import {
  getEnchantmentStatMultiplier,
  roundEquipmentStatValue,
  type StatId,
} from "@game/gameplay";
import { WORLD_ZONE_IDS } from "../apps/client/src/data/worldContentCatalog.js";
import { WEAPON_ITEM_DEFINITIONS } from "../apps/client/src/data/weaponContentCatalog.js";
import { runCombatRuntimeBenchmark } from "../apps/client/src/runtime/CombatRuntimeBenchmarkHarness.js";

const STAT_PHYSICAL_DAMAGE = "stat_physical_damage" as StatId;
const S3_RATIO = 2.07;

const CASES = [
  {
    tier: 5 as const,
    weaponItemId: "item_weapon_gloves_t5_spiked_gauntlets",
    zoneDefId: WORLD_ZONE_IDS.ironveil,
    armor: [
      "item_helmet_t5_reinforced",
      "item_armor_t5_leather",
      "item_boots_t5_leather",
      "item_traveler_cape",
    ] as const,
  },
  {
    tier: 6 as const,
    weaponItemId: "item_weapon_gloves_t6_spiked_gauntlets",
    zoneDefId: WORLD_ZONE_IDS.ashenpeak,
    armor: [
      "item_helmet_t6_reinforced",
      "item_armor_t6_leather",
      "item_boots_t6_leather",
      "item_traveler_cape",
    ] as const,
  },
] as const;

type TierCase = (typeof CASES)[number];
type MutableEquipmentInfo = {
  stats?: Partial<Record<StatId, number>>;
};

const authoredBaseByTier = new Map<number, number>();
for (const testCase of CASES) {
  const definition = WEAPON_ITEM_DEFINITIONS[testCase.weaponItemId] as MutableEquipmentInfo | undefined;
  const base = definition?.stats?.[STAT_PHYSICAL_DAMAGE];
  if (typeof base !== "number") throw new Error(`Missing ${testCase.weaponItemId} physical damage`);
  authoredBaseByTier.set(testCase.tier, base);
}

function setCandidateBase(testCase: TierCase, candidateBase: number): void {
  const definition = WEAPON_ITEM_DEFINITIONS[testCase.weaponItemId] as MutableEquipmentInfo | undefined;
  if (definition?.stats === undefined) throw new Error(`Missing ${testCase.weaponItemId} stats`);
  definition.stats[STAT_PHYSICAL_DAMAGE] = candidateBase;
}

function restoreAuthoredBases(): void {
  for (const testCase of CASES) {
    const authored = authoredBaseByTier.get(testCase.tier);
    if (authored !== undefined) setCandidateBase(testCase, authored);
  }
}

function runCase(
  testCase: TierCase,
  enchantment: 2 | 3,
  useHealthPotions: boolean,
) {
  const contract = getWorldTierTransitionContract(testCase.tier);
  return runCombatRuntimeBenchmark({
    label: `spiked_t${String(testCase.tier)}_base_scan_${String(enchantment)}_${String(useHealthPotions)}`,
    weaponItemId: testCase.weaponItemId,
    zoneDefId: testCase.zoneDefId,
    segmentIndex: 9,
    equipmentItemIds: testCase.armor,
    masteryLevel: contract.masteryLevel,
    enchantment,
    useHealthPotions,
  });
}

function evaluateTier(testCase: TierCase, candidateBase: number) {
  setCandidateBase(testCase, candidateBase);
  const contract = getWorldTierTransitionContract(testCase.tier);
  const blocked = runCase(testCase, contract.blockedEnchantment, true);
  const requiredNoPotion = runCase(testCase, contract.requiredEnchantment, false);
  const requiredPotion = runCase(testCase, contract.requiredEnchantment, true);
  return {
    tier: testCase.tier,
    candidateBase,
    effectiveBase: roundEquipmentStatValue(STAT_PHYSICAL_DAMAGE, candidateBase),
    blockedClear: blocked.clear,
    blockedBossProgress: blocked.bossProgressPercent,
    requiredNoPotionClear: requiredNoPotion.clear,
    requiredPotionClear: requiredPotion.clear,
    requiredPotionHp: requiredPotion.hpPercent,
    validGate: !blocked.clear && !requiredNoPotion.clear && requiredPotion.clear,
  };
}

try {
  const t5Case = CASES[0];
  const t6Case = CASES[1];
  const t5Valid: ReturnType<typeof evaluateTier>[] = [];
  const t6Valid: ReturnType<typeof evaluateTier>[] = [];

  // Integer gameplay damage is authoritative after rounding, so scan integer base values.
  for (let base = 130; base <= 150; base += 1) {
    const result = evaluateTier(t5Case, base);
    if (result.validGate) t5Valid.push(result);
  }
  restoreAuthoredBases();

  for (let base = 188; base <= 210; base += 1) {
    const result = evaluateTier(t6Case, base);
    if (result.validGate) t6Valid.push(result);
  }
  restoreAuthoredBases();

  const validPairs: Array<{
    t5Base: number;
    t6Base: number;
    t5EffectiveBase: number;
    t5ThreeEffective: number;
    t6EffectiveBase: number;
    t5PotionHp: number;
    t6PotionHp: number;
    distanceFromAuthored: number;
  }> = [];

  for (const t5 of t5Valid) {
    const t5ThreeEffective = roundEquipmentStatValue(
      STAT_PHYSICAL_DAMAGE,
      t5.candidateBase * getEnchantmentStatMultiplier(3),
    );
    for (const t6 of t6Valid) {
      if (t6.effectiveBase <= t5ThreeEffective) continue;
      validPairs.push({
        t5Base: t5.candidateBase,
        t6Base: t6.candidateBase,
        t5EffectiveBase: t5.effectiveBase,
        t5ThreeEffective,
        t6EffectiveBase: t6.effectiveBase,
        t5PotionHp: t5.requiredPotionHp,
        t6PotionHp: t6.requiredPotionHp,
        distanceFromAuthored:
          Math.abs(t5.candidateBase - (authoredBaseByTier.get(5) ?? t5.candidateBase))
          + Math.abs(t6.candidateBase - (authoredBaseByTier.get(6) ?? t6.candidateBase)),
      });
    }
  }

  validPairs.sort((a, b) =>
    a.distanceFromAuthored - b.distanceFromAuthored
    || a.t5Base - b.t5Base
    || a.t6Base - b.t6Base,
  );

  console.log("[SPIKED_FLAT_DAMAGE_WINDOW_REFERENCE]", {
    authoredT5Base: authoredBaseByTier.get(5),
    authoredT6Base: authoredBaseByTier.get(6),
    s3Ratio: S3_RATIO,
    contract: "T5/T6: .2+potion FAIL / .3 no potion FAIL / .3+potion CLEAR; T6.0 > T5.3 after runtime rounding",
  });
  console.log("[SPIKED_T5_VALID_BASES]");
  console.table(t5Valid);
  console.log("[SPIKED_T6_VALID_BASES]");
  console.table(t6Valid);

  if (validPairs.length === 0) {
    console.log("[SPIKED_FLAT_DAMAGE_WINDOW]", { found: false });
    process.exitCode = 1;
  } else {
    console.log("[SPIKED_FLAT_DAMAGE_WINDOW]", {
      found: true,
      validPairCount: validPairs.length,
      recommendation: validPairs[0],
    });
    console.log("[SPIKED_FLAT_DAMAGE_WINDOW_TOP5]");
    console.table(validPairs.slice(0, 5));
  }
} finally {
  restoreAuthoredBases();
}

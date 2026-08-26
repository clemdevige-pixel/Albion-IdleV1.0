import { getWorldTierTransitionContract } from "@game/data";
import { WORLD_ZONE_IDS } from "../apps/client/src/data/worldContentCatalog.js";
import { runCombatRuntimeBenchmark } from "../apps/client/src/runtime/CombatRuntimeBenchmarkHarness.js";

const S3 = "ability_gloves_seismic_impact";
const AUTHORED_S3_RATIO = 2.07;

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

function runCase(
  candidateRatio: number,
  testCase: (typeof CASES)[number],
  enchantment: 2 | 3,
  useHealthPotions: boolean,
) {
  const contract = getWorldTierTransitionContract(testCase.tier);
  return runCombatRuntimeBenchmark({
    label: `spiked_t${String(testCase.tier)}_ratio_${candidateRatio.toFixed(3)}_${String(enchantment)}_${String(useHealthPotions)}`,
    weaponItemId: testCase.weaponItemId,
    zoneDefId: testCase.zoneDefId,
    segmentIndex: 9,
    equipmentItemIds: testCase.armor,
    masteryLevel: contract.masteryLevel,
    enchantment,
    useHealthPotions,
    damageTuning: {
      directAbilityMultiplierById: {
        [S3]: candidateRatio / AUTHORED_S3_RATIO,
      },
    },
  });
}

function evaluate(candidateRatio: number) {
  const rows = CASES.map((testCase) => {
    const contract = getWorldTierTransitionContract(testCase.tier);
    const blocked = runCase(candidateRatio, testCase, contract.blockedEnchantment, true);
    const requiredNoPotion = runCase(candidateRatio, testCase, contract.requiredEnchantment, false);
    const requiredPotion = runCase(candidateRatio, testCase, contract.requiredEnchantment, true);
    return {
      tier: testCase.tier,
      blockedClear: blocked.clear,
      blockedBossProgress: blocked.bossProgressPercent,
      requiredNoPotionClear: requiredNoPotion.clear,
      requiredPotionClear: requiredPotion.clear,
      requiredPotionHp: requiredPotion.hpPercent,
      valid: !blocked.clear && !requiredNoPotion.clear && requiredPotion.clear,
    };
  });

  return {
    candidateRatio,
    rows,
    valid: rows.every((row) => row.valid),
  };
}

const valid: ReturnType<typeof evaluate>[] = [];
for (let ratio = 2.8; ratio >= 2.4; ratio = Number((ratio - 0.005).toFixed(3))) {
  const result = evaluate(ratio);
  if (result.valid) valid.push(result);
}

console.log("[SPIKED_CROSS_TIER_GATE_WINDOW_REFERENCE]", {
  authoredS3Ratio: AUTHORED_S3_RATIO,
  contract: "T5/T6: .2+potion FAIL / .3 no potion FAIL / .3+potion CLEAR",
  note: "Current T6 base is used exactly as resolved by live runtime. Equipment damage rounds to integer gameplay values.",
});

if (valid.length === 0) {
  console.log("[SPIKED_CROSS_TIER_GATE_WINDOW]", { found: false });
  process.exitCode = 1;
} else {
  const highest = valid[0];
  const lowest = valid[valid.length - 1];
  console.log("[SPIKED_CROSS_TIER_GATE_WINDOW]", {
    found: true,
    lowestPassingS3Ratio: lowest?.candidateRatio,
    highestPassingS3Ratio: highest?.candidateRatio,
    recommendedMidpoint: lowest !== undefined && highest !== undefined
      ? Number(((lowest.candidateRatio + highest.candidateRatio) / 2).toFixed(3))
      : undefined,
  });
  console.log("[SPIKED_CROSS_TIER_GATE_WINDOW_EDGES]");
  console.table([
    ...(lowest?.rows ?? []).map((row) => ({ edge: "lowest", ratio: lowest?.candidateRatio, ...row })),
    ...(highest?.rows ?? []).map((row) => ({ edge: "highest", ratio: highest?.candidateRatio, ...row })),
  ]);
}

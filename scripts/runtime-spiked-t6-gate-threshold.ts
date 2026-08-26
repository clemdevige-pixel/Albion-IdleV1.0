import { getWorldTierTransitionContract } from "@game/data";
import { resolveEquipmentInfo } from "../apps/client/src/data/itemContentCatalog.js";
import { WORLD_ZONE_IDS } from "../apps/client/src/data/worldContentCatalog.js";
import { runCombatRuntimeBenchmark } from "../apps/client/src/runtime/CombatRuntimeBenchmarkHarness.js";

const TIER = 6 as const;
const WEAPON = "item_weapon_gloves_t6_spiked_gauntlets";
const S3 = "ability_gloves_seismic_impact";
const AUTHORED_S3_RATIO = 2.8;
const ARMOR = [
  "item_helmet_t6_reinforced",
  "item_armor_t6_leather",
  "item_boots_t6_leather",
  "item_traveler_cape",
] as const;

const contract = getWorldTierTransitionContract(TIER);
const baseDamage = resolveEquipmentInfo(WEAPON)?.stats?.stat_physical_damage;
if (typeof baseDamage !== "number") throw new Error("Missing Spiked T6 physical damage");

function run(multiplier: number, enchantment: 2 | 3, useHealthPotions: boolean) {
  return runCombatRuntimeBenchmark({
    label: `spiked_t6_gate_threshold_${String(multiplier)}_${String(enchantment)}_${String(useHealthPotions)}`,
    weaponItemId: WEAPON,
    zoneDefId: WORLD_ZONE_IDS.ashenpeak,
    segmentIndex: 9,
    equipmentItemIds: ARMOR,
    masteryLevel: contract.masteryLevel,
    enchantment,
    useHealthPotions,
    damageTuning: {
      directAbilityMultiplierById: { [S3]: multiplier },
    },
  });
}

function evaluate(multiplier: number) {
  const blocked = run(multiplier, contract.blockedEnchantment, true);
  const requiredNoPotion = run(multiplier, contract.requiredEnchantment, false);
  const requiredPotion = run(multiplier, contract.requiredEnchantment, true);
  return {
    multiplier,
    resultingS3Ratio: Number((AUTHORED_S3_RATIO * multiplier).toFixed(4)),
    blockedClear: blocked.clear,
    blockedHp: blocked.hpPercent,
    blockedBossProgress: blocked.bossProgressPercent,
    requiredNoPotionClear: requiredNoPotion.clear,
    requiredNoPotionHp: requiredNoPotion.hpPercent,
    requiredPotionClear: requiredPotion.clear,
    requiredPotionHp: requiredPotion.hpPercent,
    valid: !blocked.clear && !requiredNoPotion.clear && requiredPotion.clear,
  };
}

// Find the smallest nerf, i.e. the highest multiplier below 1 that restores the full gate contract.
let winning: ReturnType<typeof evaluate> | undefined;
let previous = 1;
for (let multiplier = 1; multiplier >= 0.2; multiplier = Number((multiplier - 0.01).toFixed(2))) {
  const result = evaluate(multiplier);
  if (result.valid) {
    winning = result;
    previous = Number((multiplier + 0.01).toFixed(2));
    break;
  }
}

if (winning === undefined) {
  console.log("[SPIKED_T6_GATE_THRESHOLD]", { baseDamage, found: false });
  process.exitCode = 1;
} else {
  // Fine scan at 0.001 between the first valid coarse point and the previous invalid point.
  let fine = winning;
  for (let multiplier = previous; multiplier >= winning.multiplier; multiplier = Number((multiplier - 0.001).toFixed(3))) {
    const result = evaluate(multiplier);
    if (result.valid) {
      fine = result;
      break;
    }
  }

  console.log("[SPIKED_T6_GATE_THRESHOLD_REFERENCE]", {
    baseDamage,
    minimumLegalBaseDamageExclusive: 191,
    authoredS3Ratio: AUTHORED_S3_RATIO,
    contract: "T6.2+potion FAIL / T6.3 no potion FAIL / T6.3+potion CLEAR",
  });
  console.log("[SPIKED_T6_GATE_THRESHOLD]");
  console.table([fine]);
  console.log("[SPIKED_T6_GATE_THRESHOLD_RECOMMENDATION]", {
    directAbilityMultiplier: fine.multiplier,
    s3RatioMaximumPassingAtCurrentBase: fine.resultingS3Ratio,
    note: "Use the highest passing multiplier: this is the minimal S3 nerf measured by the live runtime harness.",
  });
}

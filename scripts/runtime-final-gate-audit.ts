import { getWorldTierTransitionContract } from "@game/data";
import { runCombatRuntimeBenchmark } from "../apps/client/src/runtime/CombatRuntimeBenchmarkHarness.js";
import {
  FINAL_SEGMENT_INDEX,
  SOURCE_TIERS,
  equipmentFor,
  shortWeaponName,
  weaponItemIds,
  zoneIdFor,
  zoneName,
} from "./lib/world-progression-benchmark.js";

const rows = SOURCE_TIERS.flatMap((sourceTier) => {
  const contract = getWorldTierTransitionContract(sourceTier);
  const zoneDefId = zoneIdFor(sourceTier, contract.finalZoneIndex);

  return weaponItemIds(sourceTier).map((weaponItemId) => {
    const common = {
      weaponItemId,
      zoneDefId,
      segmentIndex: FINAL_SEGMENT_INDEX,
      equipmentItemIds: equipmentFor(weaponItemId, sourceTier),
      masteryLevel: contract.masteryLevel,
    } as const;
    const blockedPotion = runCombatRuntimeBenchmark({
      label: "final_gate_blocked_potion",
      ...common,
      enchantment: contract.blockedEnchantment,
      useHealthPotions: true,
    });
    const requiredNoPotion = runCombatRuntimeBenchmark({
      label: "final_gate_required_no_potion",
      ...common,
      enchantment: contract.requiredEnchantment,
      useHealthPotions: false,
    });
    const requiredPotion = runCombatRuntimeBenchmark({
      label: "final_gate_required_potion",
      ...common,
      enchantment: contract.requiredEnchantment,
      useHealthPotions: true,
    });
    const status = !blockedPotion.clear && !requiredNoPotion.clear && requiredPotion.clear
      ? "PASS" as const
      : "FAIL" as const;

    return {
      transition: `T${String(sourceTier)}→T${String(sourceTier + 1)}`,
      tier: sourceTier,
      bandStep: contract.finalZoneIndex + 1,
      zone: zoneName(String(zoneDefId)),
      weapon: shortWeaponName(weaponItemId),
      blockedGear: `T${String(sourceTier)}.${String(contract.blockedEnchantment)}`,
      requiredGear: `T${String(sourceTier)}.${String(contract.requiredEnchantment)}`,
      blockedPotionClear: blockedPotion.clear,
      requiredNoPotionClear: requiredNoPotion.clear,
      requiredPotionClear: requiredPotion.clear,
      requiredPotionHp: requiredPotion.hpPercent,
      requiredPotionsUsed: requiredPotion.potionsUsed,
      status,
    };
  });
});

const failures = rows.filter((row) => row.status === "FAIL");

console.log("[FINAL_GATE_CONTRACT]", {
  source: "@game/data WORLD_TIER_TRANSITION_CONTRACTS",
  scope: "final S10 gate only",
  rule: ".2 + potion fails; .3 without potion fails; .3 + potion clears",
});
console.log("[FINAL_GATES]");
console.table(rows);
console.log("[FINAL_GATE_FAILURES]");
console.table(failures);
console.log("[FINAL_GATE_RESULT]", {
  checkedRows: rows.length,
  failures: failures.length,
  status: failures.length === 0 ? "PASS" : "FAIL",
});

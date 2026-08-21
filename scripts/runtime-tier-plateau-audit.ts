import {
  getWorldProgressionTierContract,
  getWorldTierTransitionContract,
  type WorldProgressionTier,
} from "@game/data";
import {
  SOURCE_TIERS,
  WEAPON_FAMILIES,
  hasWallThenLaterClear,
  lastClearSegment,
  runLoadoutAcrossZone,
  zoneIdFor,
  zoneName,
} from "./lib/world-progression-benchmark.js";

const rows = SOURCE_TIERS.flatMap((sourceTier) => {
  const contract = getWorldTierTransitionContract(sourceTier);
  const nextTier = (sourceTier + 1) as WorldProgressionTier;
  const nextZone = getWorldProgressionTierContract(nextTier).zones.find(
    (zone) => zone.zoneIndex === contract.nextTierFirstZoneIndex,
  );
  if (nextZone === undefined || nextZone.role !== "transition_plateau") {
    throw new Error(`Missing transition plateau for T${String(sourceTier)}→T${String(nextTier)}`);
  }

  const segmentRows = runLoadoutAcrossZone(
    nextTier,
    nextZone.zoneIndex,
    nextZone.role,
    { gearTier: sourceTier, enchantment: contract.requiredEnchantment },
    contract.masteryLevel,
    "tier_transition_plateau",
  );

  return WEAPON_FAMILIES.map(([family, specialization]) => {
    const weapon = `${family} ${specialization}`;
    const weaponRows = segmentRows.filter((row) => row.weapon === weapon);
    const clearsRequiredAfkPlateau = weaponRows
      .filter((row) => row.segment <= contract.plateauMinSegments)
      .every((row) => row.clearNoPotion);
    const forbiddenLateRow = weaponRows.find(
      (row) => row.segment === contract.plateauMaxSegmentWithPotion + 1,
    );
    const clearsForbiddenLateSegmentWithPotion = forbiddenLateRow?.clearPotion ?? false;
    const monotonic = !hasWallThenLaterClear(weaponRows, false)
      && !hasWallThenLaterClear(weaponRows, true);
    const status = clearsRequiredAfkPlateau && !clearsForbiddenLateSegmentWithPotion && monotonic
      ? "PASS" as const
      : "FAIL" as const;

    return {
      transition: `T${String(sourceTier)}→T${String(nextTier)}`,
      tier: nextTier,
      bandStep: nextZone.zoneIndex + 1,
      zone: zoneName(String(zoneIdFor(nextTier, nextZone.zoneIndex))),
      sourceGear: `T${String(sourceTier)}.${String(contract.requiredEnchantment)}`,
      weapon,
      afkLastClear: lastClearSegment(weaponRows, false),
      potionLastClear: lastClearSegment(weaponRows, true),
      clearsRequiredAfkPlateau,
      clearsForbiddenLateSegmentWithPotion,
      monotonic,
      status,
    };
  });
});

const failures = rows.filter((row) => row.status === "FAIL");

console.log("[TIER_PLATEAU_CONTRACT]", {
  source: "@game/data WORLD_TIER_TRANSITION_CONTRACTS",
  scope: "post-tier transition plateau only; final gates excluded",
  rule: "previous tier .3 farms the required opening AFK plateau and cannot cross the configured late potion boundary",
});
console.log("[TIER_PLATEAUS]");
console.table(rows);
console.log("[TIER_PLATEAU_FAILURES]");
console.table(failures);
console.log("[TIER_PLATEAU_RESULT]", {
  checkedRows: rows.length,
  failures: failures.length,
  status: failures.length === 0 ? "PASS" : "FAIL",
});

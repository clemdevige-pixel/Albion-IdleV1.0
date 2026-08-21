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
    };
  });
});

const diagnostics = rows.filter((row) =>
  !row.clearsRequiredAfkPlateau
  || row.clearsForbiddenLateSegmentWithPotion
  || !row.monotonic,
);

console.log("[TIER_PLATEAU_DIAGNOSTIC]", {
  source: "@game/data WORLD_TIER_TRANSITION_CONTRACTS",
  scope: "post-tier transition plateau only; final gates excluded",
  policy: "steps 1-4 are telemetry only; reasonable leaks are tolerated",
  target: "prefer a usable opening AFK plateau without treating deviations as blockers",
  blocking: false,
});
console.log("[TIER_PLATEAUS]");
console.table(rows);
console.log("[TIER_PLATEAU_DIAGNOSTICS]");
console.table(diagnostics);
console.log("[TIER_PLATEAU_RESULT]", {
  checkedRows: rows.length,
  diagnostics: diagnostics.length,
  blockingFailures: 0,
  status: "DIAGNOSTIC",
});

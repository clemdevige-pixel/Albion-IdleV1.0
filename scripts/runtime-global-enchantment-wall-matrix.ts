import {
  getWorldProgressionTierContract,
  type WorldProgressionEnchantment,
} from "@game/data";
import {
  TARGET_TIERS,
  WEAPON_FAMILIES,
  firstWallSegment,
  fmtSegment,
  hasWallThenLaterClear,
  lastClearSegment,
  runLoadoutAcrossZone,
  zoneIdFor,
  zoneName,
} from "./lib/world-progression-benchmark.js";

const ENCHANTMENTS = [0, 1, 2, 3] as const satisfies readonly WorldProgressionEnchantment[];

interface WallRow {
  readonly tier: number;
  readonly bandStep: number;
  readonly role: string;
  readonly zone: string;
  readonly enchantment: WorldProgressionEnchantment;
  readonly gear: string;
  readonly weapon: string;
  readonly mastery: number;
  readonly afkLastClear: number;
  readonly afkFirstWall: number | null;
  readonly potionLastClear: number;
  readonly potionFirstWall: number | null;
  readonly afkS10Clear: boolean;
  readonly potionS10Clear: boolean;
  readonly afkNonMonotonic: boolean;
  readonly potionNonMonotonic: boolean;
}

interface ProgressionRow {
  readonly tier: number;
  readonly bandStep: number;
  readonly role: string;
  readonly zone: string;
  readonly transition: string;
  readonly weapon: string;
  readonly afkLastClearBefore: number;
  readonly afkLastClearAfter: number;
  readonly afkGain: number;
  readonly potionLastClearBefore: number;
  readonly potionLastClearAfter: number;
  readonly potionGain: number;
}

const wallRows: WallRow[] = [];

for (const tier of TARGET_TIERS) {
  const tierContract = getWorldProgressionTierContract(tier);
  for (const zoneContract of tierContract.zones) {
    for (const enchantment of ENCHANTMENTS) {
      const segmentRows = runLoadoutAcrossZone(
        tier,
        zoneContract.zoneIndex,
        zoneContract.role,
        { gearTier: tier, enchantment },
        zoneContract.expected.masteryLevel,
        "global_enchantment_wall_matrix",
      );

      for (const [family, specialization] of WEAPON_FAMILIES) {
        const weapon = `${family} ${specialization}`;
        const weaponRows = segmentRows.filter((row) => row.weapon === weapon);
        const s10 = weaponRows.find((row) => row.segment === 10);
        wallRows.push({
          tier,
          bandStep: zoneContract.zoneIndex + 1,
          role: zoneContract.role,
          zone: zoneName(String(zoneIdFor(tier, zoneContract.zoneIndex))),
          enchantment,
          gear: `T${String(tier)}.${String(enchantment)}`,
          weapon,
          mastery: zoneContract.expected.masteryLevel,
          afkLastClear: lastClearSegment(weaponRows, false),
          afkFirstWall: firstWallSegment(weaponRows, false),
          potionLastClear: lastClearSegment(weaponRows, true),
          potionFirstWall: firstWallSegment(weaponRows, true),
          afkS10Clear: s10?.clearNoPotion ?? false,
          potionS10Clear: s10?.clearPotion ?? false,
          afkNonMonotonic: hasWallThenLaterClear(weaponRows, false),
          potionNonMonotonic: hasWallThenLaterClear(weaponRows, true),
        });
      }
    }
  }
}

const progressionRows: ProgressionRow[] = [];
for (const tier of TARGET_TIERS) {
  for (const zoneContract of getWorldProgressionTierContract(tier).zones) {
    const zone = zoneName(String(zoneIdFor(tier, zoneContract.zoneIndex)));
    for (const [family, specialization] of WEAPON_FAMILIES) {
      const weapon = `${family} ${specialization}`;
      for (const nextEnchantment of [1, 2, 3] as const) {
        const previousEnchantment = (nextEnchantment - 1) as WorldProgressionEnchantment;
        const before = wallRows.find((row) =>
          row.tier === tier
          && row.bandStep === zoneContract.zoneIndex + 1
          && row.enchantment === previousEnchantment
          && row.weapon === weapon,
        );
        const after = wallRows.find((row) =>
          row.tier === tier
          && row.bandStep === zoneContract.zoneIndex + 1
          && row.enchantment === nextEnchantment
          && row.weapon === weapon,
        );
        if (before === undefined || after === undefined) {
          throw new Error(`Missing wall row for T${String(tier)} ${zone} ${weapon} .${String(previousEnchantment)}→.${String(nextEnchantment)}`);
        }
        progressionRows.push({
          tier,
          bandStep: zoneContract.zoneIndex + 1,
          role: zoneContract.role,
          zone,
          transition: `T${String(tier)}.${String(previousEnchantment)}→T${String(tier)}.${String(nextEnchantment)}`,
          weapon,
          afkLastClearBefore: before.afkLastClear,
          afkLastClearAfter: after.afkLastClear,
          afkGain: after.afkLastClear - before.afkLastClear,
          potionLastClearBefore: before.potionLastClear,
          potionLastClearAfter: after.potionLastClear,
          potionGain: after.potionLastClear - before.potionLastClear,
        });
      }
    }
  }
}

console.log("[GLOBAL_ENCHANTMENT_WALL_MATRIX_CONTRACT]", {
  tiers: "T4-T8",
  zones: "all zones authored in each tier progression contract; Blue/T4 currently covers Golden Steppe + Frostpeak because earlier Blue steps belong to the T3 progression block",
  weapons: WEAPON_FAMILIES.length,
  enchantments: ENCHANTMENTS,
  mastery: "authored expected mastery for the zone, held constant across .0/.1/.2/.3",
  modes: ["AFK", "potion"],
  output: "deepest clear + first failed segment per weapon/zone/enchantment, with explicit non-monotonic flags; first failure is not a hard wall when a later segment clears",
  finalGate: "benchmark:final-gates remains authoritative for step 5 S10 contract",
});

for (const tier of TARGET_TIERS) {
  console.log(`[T${String(tier)}_GLOBAL_WALL_MATRIX]`);
  console.table(wallRows.filter((row) => row.tier === tier).map((row) => ({
    step: row.bandStep,
    zone: row.zone,
    role: row.role,
    gear: row.gear,
    weapon: row.weapon,
    mastery: row.mastery,
    afkDeepestClear: fmtSegment(row.afkLastClear),
    afkFirstFailure: row.afkFirstWall === null ? "-" : `S${String(row.afkFirstWall)}`,
    afkNonMonotonic: row.afkNonMonotonic,
    potionDeepestClear: fmtSegment(row.potionLastClear),
    potionFirstFailure: row.potionFirstWall === null ? "-" : `S${String(row.potionFirstWall)}`,
    potionNonMonotonic: row.potionNonMonotonic,
    afkS10: row.afkS10Clear,
    potionS10: row.potionS10Clear,
  })));
}

console.log("[GLOBAL_ENCHANTMENT_PROGRESSION_DELTAS]");
console.table(progressionRows.map((row) => ({
  tier: row.tier,
  step: row.bandStep,
  zone: row.zone,
  transition: row.transition,
  weapon: row.weapon,
  afkDeepest: `${fmtSegment(row.afkLastClearBefore)}→${fmtSegment(row.afkLastClearAfter)}`,
  afkGain: row.afkGain,
  potionDeepest: `${fmtSegment(row.potionLastClearBefore)}→${fmtSegment(row.potionLastClearAfter)}`,
  potionGain: row.potionGain,
})));

const nonMonotonic = wallRows.filter((row) => row.afkNonMonotonic || row.potionNonMonotonic);
console.log("[GLOBAL_ENCHANTMENT_NON_MONOTONIC_DIAGNOSTICS]");
console.table(nonMonotonic.map((row) => ({
  tier: row.tier,
  step: row.bandStep,
  zone: row.zone,
  gear: row.gear,
  weapon: row.weapon,
  afkDeepestClear: fmtSegment(row.afkLastClear),
  afkFirstFailure: row.afkFirstWall === null ? "-" : `S${String(row.afkFirstWall)}`,
  afkNonMonotonic: row.afkNonMonotonic,
  potionDeepestClear: fmtSegment(row.potionLastClear),
  potionFirstFailure: row.potionFirstWall === null ? "-" : `S${String(row.potionFirstWall)}`,
  potionNonMonotonic: row.potionNonMonotonic,
})));

console.log("[GLOBAL_ENCHANTMENT_WALL_MATRIX_RESULT]", {
  wallRows: wallRows.length,
  progressionRows: progressionRows.length,
  nonMonotonicRows: nonMonotonic.length,
});
console.log("[GLOBAL_ENCHANTMENT_WALL_MATRIX_JSON]", JSON.stringify({ wallRows, progressionRows, nonMonotonic }, null, 2));

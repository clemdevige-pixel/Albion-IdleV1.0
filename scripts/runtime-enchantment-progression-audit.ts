import {
  WORLD_ENCHANTMENT_PROGRESSION_CONTRACT,
  getWorldProgressionTierContract,
  type WorldProgressionEnchantment,
} from "@game/data";
import {
  TARGET_TIERS,
  WEAPON_FAMILIES,
  fmtSegment,
  lastClearSegment,
  runLoadoutAcrossZone,
  type SegmentRun,
  zoneIdFor,
  zoneName,
} from "./lib/world-progression-benchmark.js";

type ProgressionSignal = "wall" | "afk_quality" | "active_quality" | "none";

interface EnchantmentProgressionRow {
  readonly tier: number;
  readonly bandStep: number;
  readonly zone: string;
  readonly transition: string;
  readonly weapon: string;
  readonly previousAfkLastClear: number;
  readonly expectedAfkLastClear: number;
  readonly afkUpgradeGain: number;
  readonly probeSegment: number;
  readonly afkQualityImproved: boolean;
  readonly activeQualityImproved: boolean;
  readonly progressionSignal: ProgressionSignal;
  readonly status: "PASS" | "FAIL";
}

function rowAt(rows: readonly SegmentRun[], segment: number): SegmentRun {
  const row = rows.find((candidate) => candidate.segment === segment);
  if (row === undefined) throw new Error(`Missing benchmark row for S${String(segment)}`);
  return row;
}

function afkQualityImproved(previous: SegmentRun, expected: SegmentRun): boolean {
  if (previous.clearNoPotion !== expected.clearNoPotion) return expected.clearNoPotion;
  if (expected.clearNoPotion) {
    return expected.afkSeconds < previous.afkSeconds
      || expected.afkHpPercent > previous.afkHpPercent;
  }
  return expected.afkEncounterReached > previous.afkEncounterReached
    || expected.afkDamageDealt > previous.afkDamageDealt
    || expected.afkSeconds > previous.afkSeconds;
}

function activeQualityImproved(previous: SegmentRun, expected: SegmentRun): boolean {
  if (previous.clearPotion !== expected.clearPotion) return expected.clearPotion;
  if (expected.clearPotion) {
    return expected.potionPotionsUsed < previous.potionPotionsUsed
      || expected.potionSeconds < previous.potionSeconds
      || expected.potionHpPercent > previous.potionHpPercent;
  }
  return expected.potionEncounterReached > previous.potionEncounterReached
    || expected.potionDamageDealt > previous.potionDamageDealt
    || expected.potionSeconds > previous.potionSeconds;
}

const rows: EnchantmentProgressionRow[] = [];

for (const tier of TARGET_TIERS) {
  for (const zoneContract of getWorldProgressionTierContract(tier).zones) {
    if (zoneContract.role !== "progression") continue;
    if (zoneContract.expected.enchantment === 0) continue;

    const expectedEnchantment = zoneContract.expected.enchantment;
    const previousEnchantment = (expectedEnchantment - 1) as WorldProgressionEnchantment;
    const previousRows = runLoadoutAcrossZone(
      tier,
      zoneContract.zoneIndex,
      zoneContract.role,
      { gearTier: tier, enchantment: previousEnchantment },
      zoneContract.expected.masteryLevel,
      "same_tier_enchantment_previous",
    );
    const expectedRows = runLoadoutAcrossZone(
      tier,
      zoneContract.zoneIndex,
      zoneContract.role,
      { gearTier: tier, enchantment: expectedEnchantment },
      zoneContract.expected.masteryLevel,
      "same_tier_enchantment_expected",
    );

    for (const [family, specialization] of WEAPON_FAMILIES) {
      const weapon = `${family} ${specialization}`;
      const previousWeaponRows = previousRows.filter((row) => row.weapon === weapon);
      const expectedWeaponRows = expectedRows.filter((row) => row.weapon === weapon);
      const previousAfkLastClear = lastClearSegment(previousWeaponRows, false);
      const expectedAfkLastClear = lastClearSegment(expectedWeaponRows, false);
      const afkUpgradeGain = expectedAfkLastClear - previousAfkLastClear;
      const probeSegment = Math.max(1, previousAfkLastClear);
      const previousProbe = rowAt(previousWeaponRows, probeSegment);
      const expectedProbe = rowAt(expectedWeaponRows, probeSegment);
      const afkQuality = afkQualityImproved(previousProbe, expectedProbe);
      const activeQuality = activeQualityImproved(previousProbe, expectedProbe);
      const wallImproved = afkUpgradeGain >= WORLD_ENCHANTMENT_PROGRESSION_CONTRACT.minAfkUpgradeGainSegments;
      const progressionSignal: ProgressionSignal = wallImproved
        ? "wall"
        : afkQuality
          ? "afk_quality"
          : activeQuality
            ? "active_quality"
            : "none";

      rows.push({
        tier,
        bandStep: zoneContract.zoneIndex + 1,
        zone: zoneName(String(zoneIdFor(tier, zoneContract.zoneIndex))),
        transition: `T${String(tier)}.${String(previousEnchantment)}→T${String(tier)}.${String(expectedEnchantment)}`,
        weapon,
        previousAfkLastClear,
        expectedAfkLastClear,
        afkUpgradeGain,
        probeSegment,
        afkQualityImproved: afkQuality,
        activeQualityImproved: activeQuality,
        progressionSignal,
        status: progressionSignal === "none" ? "FAIL" : "PASS",
      });
    }
  }
}

const failures = rows.filter((row) => row.status === "FAIL");

console.log("[ENCHANTMENT_PROGRESSION_CONTRACT]", {
  source: "@game/data WORLD_ENCHANTMENT_PROGRESSION_CONTRACT + live combat telemetry",
  scope: "same-tier enchantments only (.0→.1, .1→.2, .2→.3); tier changes excluded",
  blockingRule: "every enchantment must create a visible combat gain",
  signalPriority: [
    `AFK wall +${String(WORLD_ENCHANTMENT_PROGRESSION_CONTRACT.minAfkUpgradeGainSegments)} segment or more`,
    "otherwise better AFK quality on the same probe segment",
    "otherwise better active/potion quality on the same probe segment",
  ],
  qualityMetrics: {
    clear: "faster clear or more HP remaining",
    activeClear: "fewer potions, faster clear or more HP remaining",
    failedRun: "further encounter, more damage dealt or longer survival",
  },
  finalGate: "not evaluated here; benchmark:final-gates remains authoritative for step 5 S10",
});
console.log("[ENCHANTMENT_PROGRESSION]");
console.table(rows.map((row) => ({
  tier: row.tier,
  bandStep: row.bandStep,
  zone: row.zone,
  transition: row.transition,
  weapon: row.weapon,
  previousAfk: fmtSegment(row.previousAfkLastClear),
  expectedAfk: fmtSegment(row.expectedAfkLastClear),
  upgradeGain: row.afkUpgradeGain,
  probe: `S${String(row.probeSegment)}`,
  afkQuality: row.afkQualityImproved,
  activeQuality: row.activeQualityImproved,
  signal: row.progressionSignal,
  status: row.status,
})));
console.log("[ENCHANTMENT_PROGRESSION_FAILURES]");
console.table(failures);
console.log("[ENCHANTMENT_PROGRESSION_RESULT]", {
  checkedRows: rows.length,
  visibleProgression: rows.length - failures.length,
  invisibleEnchantments: failures.length,
  status: failures.length === 0 ? "PASS" : "FAIL",
});

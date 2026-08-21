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
  zoneIdFor,
  zoneName,
} from "./lib/world-progression-benchmark.js";

interface EnchantmentProgressionRow {
  readonly tier: number;
  readonly bandStep: number;
  readonly zone: string;
  readonly transition: string;
  readonly weapon: string;
  readonly previousAfkLastClear: number;
  readonly expectedAfkLastClear: number;
  readonly afkUpgradeGain: number;
  readonly previousPotionLastClear: number;
  readonly potionPushGainTelemetry: number;
  readonly markedUpgrade: boolean;
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
      const previousPotionLastClear = lastClearSegment(previousWeaponRows, true);
      const afkUpgradeGain = expectedAfkLastClear - previousAfkLastClear;

      rows.push({
        tier,
        bandStep: zoneContract.zoneIndex + 1,
        zone: zoneName(String(zoneIdFor(tier, zoneContract.zoneIndex))),
        transition: `T${String(tier)}.${String(previousEnchantment)}→T${String(tier)}.${String(expectedEnchantment)}`,
        weapon,
        previousAfkLastClear,
        expectedAfkLastClear,
        afkUpgradeGain,
        previousPotionLastClear,
        potionPushGainTelemetry: previousPotionLastClear - previousAfkLastClear,
        markedUpgrade: afkUpgradeGain >= WORLD_ENCHANTMENT_PROGRESSION_CONTRACT.minAfkUpgradeGainSegments,
      });
    }
  }
}

const weakUpgradeDiagnostics = rows.filter((row) => !row.markedUpgrade);

console.log("[ENCHANTMENT_PROGRESSION_DIAGNOSTIC]", {
  source: "@game/data WORLD_ENCHANTMENT_PROGRESSION_CONTRACT",
  scope: "same-tier enchantments only (.0→.1, .1→.2, .2→.3); tier changes excluded",
  policy: "steps 1-4 are telemetry only; leaks and flat AFK walls are tolerated",
  target: `prefer AFK wall movement of at least ${String(WORLD_ENCHANTMENT_PROGRESSION_CONTRACT.minAfkUpgradeGainSegments)} segment when practical`,
  blocking: false,
  potion: "telemetry only",
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
  previousPotion: fmtSegment(row.previousPotionLastClear),
  potionGainTelemetry: row.potionPushGainTelemetry,
  markedUpgrade: row.markedUpgrade,
})));
console.log("[ENCHANTMENT_WEAK_UPGRADE_DIAGNOSTICS]");
console.table(weakUpgradeDiagnostics);
console.log("[ENCHANTMENT_PROGRESSION_RESULT]", {
  checkedRows: rows.length,
  weakUpgradeDiagnostics: weakUpgradeDiagnostics.length,
  blockingFailures: 0,
  status: "DIAGNOSTIC",
});

import {
  ENCHANTMENT_STAT_MULTIPLIER,
  type EquipmentInfoLike,
} from "@game/gameplay";
import {
  getWorldProgressionTierContract,
  getWorldTierTransitionContract,
  type WorldProgressionEnchantment,
  type WorldProgressionSourceTier,
  type WorldProgressionTier,
} from "@game/data";
import {
  ITEM_DEFINITIONS,
  resolveEquipmentInfo,
} from "../apps/client/src/data/itemContentCatalog.js";
import {
  WORLD_ZONE_IDS_BY_BAND,
  ZONE_DEFINITIONS,
} from "../apps/client/src/data/worldContentCatalog.js";
import { runCombatRuntimeBenchmark } from "../apps/client/src/runtime/CombatRuntimeBenchmarkHarness.js";

type Tier = 3 | WorldProgressionTier;
type MutableEquipmentDefinition = { stats?: Record<string, number> };
type MutableEnchantmentCurve = Record<0 | 1 | 2 | 3 | 4, number>;

const SOURCE_TIERS = [4, 5, 6, 7] as const satisfies readonly WorldProgressionSourceTier[];
const ENTRY_TIERS = [5, 6, 7, 8] as const satisfies readonly WorldProgressionTier[];
const WEAPON_FAMILIES = [
  ["sword", "broadsword"],
  ["bow", "longbow"],
  ["staff", "infernal"],
  ["gloves", "spiked_gauntlets"],
  ["dagger", "pair"],
] as const;
const SEGMENTS_PER_ZONE = 10;

const ENCHANTMENT_CURVE_CANDIDATES = [
  { id: "live", e1: 1.12, e2: 1.26, e3: 1.42 },
  { id: "gentle", e1: 1.14, e2: 1.29, e3: 1.42 },
  { id: "medium", e1: 1.16, e2: 1.32, e3: 1.42 },
  { id: "frontloaded", e1: 1.18, e2: 1.33, e3: 1.42 },
  { id: "balanced", e1: 1.16, e2: 1.34, e3: 1.42 },
  { id: "strong", e1: 1.18, e2: 1.35, e3: 1.42 },
] as const;

const TIER_ENTRY_SCALE_CANDIDATES = [
  1, 1.025, 1.05, 1.075, 1.1, 1.125, 1.15, 1.175, 1.2, 1.225, 1.25, 1.275, 1.3,
] as const;

function weaponItemIds(tier: Tier): readonly string[] {
  return WEAPON_FAMILIES.map(([family, specialization]) =>
    `item_weapon_${family}_t${String(tier)}_${specialization}`,
  );
}

function armorItemIds(tier: Tier): readonly string[] {
  if (tier === 3) {
    return ["item_iron_helmet", "item_leather_armor", "item_leather_boots", "item_traveler_cape"];
  }
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

function shortWeaponName(itemId: string): string {
  return itemId.replace("item_weapon_", "").replace(/_t\d_/, " ");
}

function zoneIdFor(tier: WorldProgressionTier, zoneIndex: number) {
  const { band } = getWorldProgressionTierContract(tier);
  const zoneDefId = WORLD_ZONE_IDS_BY_BAND[band][zoneIndex];
  if (zoneDefId === undefined) throw new Error(`Missing T${String(tier)} zone ${String(zoneIndex + 1)}`);
  return zoneDefId;
}

function zoneName(tier: WorldProgressionTier, zoneIndex: number): string {
  const zoneDefId = zoneIdFor(tier, zoneIndex);
  return ZONE_DEFINITIONS.find(({ id }) => String(id) === String(zoneDefId))?.name ?? String(zoneDefId);
}

function runSegment(
  tier: Tier,
  enchantment: WorldProgressionEnchantment,
  weaponItemId: string,
  zoneTier: WorldProgressionTier,
  zoneIndex: number,
  segmentIndex: number,
  masteryLevel: number,
  useHealthPotions: boolean,
): boolean {
  return runCombatRuntimeBenchmark({
    label: "equipment_progression_scaling_candidate",
    weaponItemId,
    zoneDefId: zoneIdFor(zoneTier, zoneIndex),
    segmentIndex,
    equipmentItemIds: equipmentFor(weaponItemId, tier),
    masteryLevel,
    enchantment,
    useHealthPotions,
  }).clear;
}

function lastClearAfk(
  gearTier: Tier,
  enchantment: WorldProgressionEnchantment,
  weaponItemId: string,
  zoneTier: WorldProgressionTier,
  zoneIndex: number,
  masteryLevel: number,
): number {
  let lastClear = 0;
  for (let segmentIndex = 0; segmentIndex < SEGMENTS_PER_ZONE; segmentIndex += 1) {
    if (runSegment(gearTier, enchantment, weaponItemId, zoneTier, zoneIndex, segmentIndex, masteryLevel, false)) {
      lastClear = segmentIndex + 1;
    }
  }
  return lastClear;
}

function previousLoadout(
  tier: WorldProgressionTier,
  enchantment: WorldProgressionEnchantment,
): { gearTier: Tier; enchantment: WorldProgressionEnchantment } {
  if (enchantment > 0) {
    return { gearTier: tier, enchantment: (enchantment - 1) as WorldProgressionEnchantment };
  }
  return { gearTier: (tier - 1) as Tier, enchantment: 3 };
}

function snapshotEnchantmentCurve(): MutableEnchantmentCurve {
  return { ...(ENCHANTMENT_STAT_MULTIPLIER as MutableEnchantmentCurve) };
}

function applyEnchantmentCurve(e1: number, e2: number, e3: number): void {
  const curve = ENCHANTMENT_STAT_MULTIPLIER as MutableEnchantmentCurve;
  curve[0] = 1;
  curve[1] = e1;
  curve[2] = e2;
  curve[3] = e3;
  curve[4] = e3;
}

function restoreEnchantmentCurve(snapshot: MutableEnchantmentCurve): void {
  const curve = ENCHANTMENT_STAT_MULTIPLIER as MutableEnchantmentCurve;
  for (const level of [0, 1, 2, 3, 4] as const) curve[level] = snapshot[level];
}

function equipmentDefinitionsForTier(tier: WorldProgressionTier): Array<{
  definition: MutableEquipmentDefinition;
  originalStats: Record<string, number>;
}> {
  const tierMarker = `_t${String(tier)}_`;
  const rows: Array<{ definition: MutableEquipmentDefinition; originalStats: Record<string, number> }> = [];
  for (const [itemId, rawDefinition] of Object.entries(ITEM_DEFINITIONS)) {
    if (!itemId.includes(tierMarker)) continue;
    if ((resolveEquipmentInfo(itemId) as EquipmentInfoLike | undefined)?.stats === undefined) continue;
    const definition = rawDefinition as unknown as MutableEquipmentDefinition;
    if (definition.stats === undefined) continue;
    rows.push({ definition, originalStats: { ...definition.stats } });
  }
  return rows;
}

function applyTierScale(
  entries: readonly { definition: MutableEquipmentDefinition; originalStats: Record<string, number> }[],
  scale: number,
): void {
  for (const { definition, originalStats } of entries) {
    definition.stats = Object.fromEntries(Object.entries(originalStats).map(([statId, value]) => [
      statId,
      statId === "stat_attack_speed" ? value : value * scale,
    ]));
  }
}

function restoreTierScale(
  entries: readonly { definition: MutableEquipmentDefinition; originalStats: Record<string, number> }[],
): void {
  for (const { definition, originalStats } of entries) definition.stats = { ...originalStats };
}

function finalGateFailuresForTier(sourceTier: WorldProgressionSourceTier): number {
  const transition = getWorldTierTransitionContract(sourceTier);
  let failures = 0;
  for (const weaponItemId of weaponItemIds(sourceTier)) {
    const blocked = runSegment(
      sourceTier,
      transition.blockedEnchantment,
      weaponItemId,
      sourceTier,
      transition.finalZoneIndex,
      9,
      transition.masteryLevel,
      true,
    );
    const requiredNoPotion = runSegment(
      sourceTier,
      transition.requiredEnchantment,
      weaponItemId,
      sourceTier,
      transition.finalZoneIndex,
      9,
      transition.masteryLevel,
      false,
    );
    const requiredPotion = runSegment(
      sourceTier,
      transition.requiredEnchantment,
      weaponItemId,
      sourceTier,
      transition.finalZoneIndex,
      9,
      transition.masteryLevel,
      true,
    );
    if (blocked || requiredNoPotion || !requiredPotion) failures += 1;
  }
  return failures;
}

function allFinalGateFailures(): number {
  return SOURCE_TIERS.reduce((total, tier) => total + finalGateFailuresForTier(tier), 0);
}

function evaluateSameTierEnchantments() {
  const details: Array<Record<string, string | number>> = [];
  let failures = 0;

  for (const tier of [4, 5, 6, 7, 8] as const) {
    for (const zone of getWorldProgressionTierContract(tier).zones) {
      if (zone.role !== "progression" || zone.expected.enchantment === 0) continue;
      const previous = previousLoadout(tier, zone.expected.enchantment);
      for (const weaponItemId of weaponItemIds(tier)) {
        const previousAfk = lastClearAfk(
          previous.gearTier,
          previous.enchantment,
          weaponItemId,
          tier,
          zone.zoneIndex,
          zone.expected.masteryLevel,
        );
        const expectedAfk = lastClearAfk(
          tier,
          zone.expected.enchantment,
          weaponItemId,
          tier,
          zone.zoneIndex,
          zone.expected.masteryLevel,
        );
        const gain = expectedAfk - previousAfk;
        if (gain < 1) failures += 1;
        if (gain < 1) {
          details.push({
            tier,
            bandStep: zone.zoneIndex + 1,
            zone: zoneName(tier, zone.zoneIndex),
            transition: `.${String(previous.enchantment)}→.${String(zone.expected.enchantment)}`,
            weapon: shortWeaponName(weaponItemId),
            previousAfk,
            expectedAfk,
            gain,
          });
        }
      }
    }
  }
  return { failures, details };
}

function sweepEnchantmentCurve(): void {
  const original = snapshotEnchantmentCurve();
  const rows: Array<Record<string, string | number | boolean>> = [];
  try {
    for (const candidate of ENCHANTMENT_CURVE_CANDIDATES) {
      applyEnchantmentCurve(candidate.e1, candidate.e2, candidate.e3);
      const progression = evaluateSameTierEnchantments();
      const finalGateFailures = allFinalGateFailures();
      rows.push({
        id: candidate.id,
        e1: candidate.e1,
        e2: candidate.e2,
        e3: candidate.e3,
        enchantmentFailures: progression.failures,
        finalGateFailures,
        valid: progression.failures === 0 && finalGateFailures === 0,
      });
      console.log(`[ENCHANTMENT_CURVE_${candidate.id.toUpperCase()}_FAILURES]`);
      console.table(progression.details);
    }
  } finally {
    restoreEnchantmentCurve(original);
  }

  console.log("[ENCHANTMENT_CURVE_CANDIDATES]");
  console.table(rows);
  console.log("[ENCHANTMENT_CURVE_VALID_CANDIDATES_JSON]", JSON.stringify(rows.filter((row) => row.valid === true), null, 2));
}

function evaluateTierEntry(tier: WorldProgressionTier) {
  const zone = getWorldProgressionTierContract(tier).zones.find(
    (entry) => entry.role === "progression" && entry.expected.enchantment === 0,
  );
  if (zone === undefined) throw new Error(`Missing T${String(tier)} entry progression zone`);
  const previous = previousLoadout(tier, 0);
  const details: Array<Record<string, string | number>> = [];
  let failures = 0;

  for (let weaponIndex = 0; weaponIndex < WEAPON_FAMILIES.length; weaponIndex += 1) {
    const expectedWeapon = weaponItemIds(tier)[weaponIndex];
    const previousWeapon = weaponItemIds(previous.gearTier)[weaponIndex];
    if (expectedWeapon === undefined || previousWeapon === undefined) throw new Error("Missing weapon candidate");
    const previousAfk = lastClearAfk(
      previous.gearTier,
      previous.enchantment,
      previousWeapon,
      tier,
      zone.zoneIndex,
      zone.expected.masteryLevel,
    );
    const expectedAfk = lastClearAfk(
      tier,
      0,
      expectedWeapon,
      tier,
      zone.zoneIndex,
      zone.expected.masteryLevel,
    );
    const gain = expectedAfk - previousAfk;
    if (gain < 1) failures += 1;
    details.push({
      tier,
      bandStep: zone.zoneIndex + 1,
      zone: zoneName(tier, zone.zoneIndex),
      weapon: shortWeaponName(expectedWeapon),
      previousGear: `T${String(previous.gearTier)}.${String(previous.enchantment)}`,
      previousAfk,
      expectedGear: `T${String(tier)}.0`,
      expectedAfk,
      gain,
    });
  }
  return { failures, details };
}

function sweepTierEntries(): void {
  const summary: Array<Record<string, string | number | boolean>> = [];

  for (const tier of ENTRY_TIERS) {
    const definitions = equipmentDefinitionsForTier(tier);
    try {
      for (const scale of TIER_ENTRY_SCALE_CANDIDATES) {
        applyTierScale(definitions, scale);
        const progression = evaluateTierEntry(tier);
        const finalGateFailures = tier <= 7
          ? finalGateFailuresForTier(tier as WorldProgressionSourceTier)
          : 0;
        const valid = progression.failures === 0 && finalGateFailures === 0;
        summary.push({
          tier,
          scale,
          entryFailures: progression.failures,
          finalGateFailures,
          valid,
        });
        if (valid) {
          console.log(`[T${String(tier)}_ENTRY_FIRST_VALID_CANDIDATE]`);
          console.table(progression.details);
          break;
        }
      }
    } finally {
      restoreTierScale(definitions);
    }
  }

  console.log("[TIER_ENTRY_SCALE_CANDIDATES]");
  console.table(summary);
  const firstValid = ENTRY_TIERS.map((tier) => summary.find((row) => row.tier === tier && row.valid === true) ?? {
    tier,
    scale: "none<=1.30",
    valid: false,
  });
  console.log("[TIER_ENTRY_FIRST_VALID_CANDIDATES_JSON]", JSON.stringify(firstValid, null, 2));
}

function main(): void {
  console.log("[EQUIPMENT_PROGRESSION_SCALING_SWEEP_CONTRACT]", {
    mutation: "benchmark-only temporary mutation; live authored data restored after every sweep",
    enchantment: "find one shared .1/.2/.3 curve with >= +1 AFK segment per same-tier enchant step while preserving every final gate",
    tierEntry: "find the smallest whole-tier stat scale that gives Tn.0 >= +1 AFK segment over Tn-1.3; never per-weapon tuning",
    finalGate: ".2 + potion fails; .3 without potion fails; .3 + potion clears",
  });
  sweepEnchantmentCurve();
  sweepTierEntries();
}

main();

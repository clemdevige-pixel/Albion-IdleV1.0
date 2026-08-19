import { resolveEquipmentInfo } from "../apps/client/src/data/itemContentCatalog.js";
import { resolveMonsterForEncounter } from "../apps/client/src/data/monsterContentCatalog.js";
import {
  WORLD_ZONE_IDS_BY_BAND,
  ZONE_DEFINITIONS,
} from "../apps/client/src/data/worldContentCatalog.js";
import { runCombatRuntimeBenchmark } from "../apps/client/src/runtime/CombatRuntimeBenchmarkHarness.js";

type Tier = 3 | 4 | 5 | 6 | 7 | 8;
type TargetTier = 4 | 5 | 6 | 7 | 8;
type Enchantment = 0 | 1 | 2 | 3;
type BandId = "blue" | "yellow" | "orange" | "red" | "black";
type EncounterTelemetry = ReturnType<typeof runCombatRuntimeBenchmark>["encounters"];

interface TierSweepConfig {
  readonly band: BandId;
  readonly zoneIndices: readonly number[];
}

const TIER_SWEEP_CONFIG: Readonly<Record<TargetTier, TierSweepConfig>> = {
  // Blue contains T3 and T4 progression. The broad benchmark adds the two T4 zones
  // without duplicating the separate early-Blue/T3 progression diagnostics.
  4: { band: "blue", zoneIndices: [3, 4] },
  5: { band: "yellow", zoneIndices: [0, 1, 2, 3, 4] },
  6: { band: "orange", zoneIndices: [0, 1, 2, 3, 4] },
  7: { band: "red", zoneIndices: [0, 1, 2, 3, 4] },
  8: { band: "black", zoneIndices: [0, 1, 2, 3, 4] },
};

const TARGET_TIERS = [4, 5, 6, 7, 8] as const satisfies readonly TargetTier[];

const WEAPON_FAMILIES = [
  ["sword", "broadsword"],
  ["bow", "longbow"],
  ["staff", "infernal"],
  ["gloves", "spiked_gauntlets"],
  ["dagger", "pair"],
] as const;

const SEGMENTS_PER_ZONE = 10;
const FINAL_SEGMENT_INDEX = SEGMENTS_PER_ZONE - 1;

function weaponItemIds(tier: Tier): readonly string[] {
  return WEAPON_FAMILIES.map(([family, specialization]) =>
    `item_weapon_${family}_t${String(tier)}_${specialization}`,
  );
}

function armorItemIds(tier: Tier): readonly string[] {
  if (tier === 3) {
    return [
      "item_iron_helmet",
      "item_leather_armor",
      "item_leather_boots",
      "item_traveler_cape",
    ];
  }

  return [
    `item_helmet_t${String(tier)}_reinforced`,
    `item_armor_t${String(tier)}_leather`,
    `item_boots_t${String(tier)}_leather`,
    "item_traveler_cape",
  ];
}

function shieldItemId(tier: Tier): string {
  return `item_shield_t${String(tier)}_reinforced`;
}

function equipmentFor(weaponItemId: string, tier: Tier): readonly string[] {
  const items = [...armorItemIds(tier)];
  if (resolveEquipmentInfo(weaponItemId)?.handling === "one_handed") {
    items.push(shieldItemId(tier));
  }
  return items;
}

function zoneName(zoneDefId: string): string {
  return ZONE_DEFINITIONS.find(({ id }) => String(id) === zoneDefId)?.name ?? zoneDefId;
}

function shortWeaponName(itemId: string): string {
  return itemId.replace("item_weapon_", "").replace(/_t\d_/, " ");
}

function masteryBaseForTier(tier: Exclude<TargetTier, 4>): number {
  return 25 + (tier - 5) * 15;
}

interface ZoneLoadoutExpectation {
  readonly gearTier: Tier;
  readonly enchantment: Enchantment;
  readonly masteryLevel: number;
}

function expectedLoadoutForZone(tier: TargetTier, zoneIndex: number): ZoneLoadoutExpectation {
  if (tier === 4) {
    // Validated Blue late-band references:
    // Golden Steppe => T4.1 late-zone target.
    // Frostpeak => T4.2 final-wall reference; T4.3 remains the reliable AFK threshold.
    if (zoneIndex === 3) return { gearTier: 4, enchantment: 1, masteryLevel: 25 };
    if (zoneIndex === 4) return { gearTier: 4, enchantment: 2, masteryLevel: 30 };
    throw new Error(`Unexpected Blue T4 zone index ${String(zoneIndex)}`);
  }

  const base = masteryBaseForTier(tier);
  switch (zoneIndex) {
    case 0:
      return { gearTier: tier, enchantment: 0, masteryLevel: base };
    case 1:
      return { gearTier: tier, enchantment: 0, masteryLevel: base + 2 };
    case 2:
      return { gearTier: tier, enchantment: 1, masteryLevel: base + 4 };
    case 3:
      return { gearTier: tier, enchantment: 2, masteryLevel: base + 7 };
    case 4:
      return { gearTier: tier, enchantment: 2, masteryLevel: base + 10 };
    default:
      throw new Error(`Unexpected zone index ${String(zoneIndex)}`);
  }
}

interface SegmentRun {
  readonly tier: TargetTier;
  readonly band: BandId;
  readonly zoneIndex: number;
  readonly zoneDefId: NonNullable<(typeof WORLD_ZONE_IDS_BY_BAND)[BandId][number]>;
  readonly zone: string;
  readonly segment: number;
  readonly weaponItemId: string;
  readonly weapon: string;
  readonly gear: string;
  readonly mastery: number;
  readonly clearNoPotion: boolean;
  readonly hpNoPotion: number;
  readonly secondsNoPotion: number;
  readonly encountersNoPotion: number;
  readonly telemetryNoPotion: EncounterTelemetry;
  readonly clearPotion: boolean;
  readonly hpPotion: number;
  readonly secondsPotion: number;
  readonly potionsUsed: number;
  readonly encountersPotion: number;
  readonly telemetryPotion: EncounterTelemetry;
}

function runSegment(
  tier: TargetTier,
  zoneIndex: number,
  segmentIndex: number,
  weaponItemId: string,
): SegmentRun {
  const band = TIER_SWEEP_CONFIG[tier].band;
  const zoneDefId = WORLD_ZONE_IDS_BY_BAND[band][zoneIndex];
  if (zoneDefId === undefined) throw new Error(`Missing zone ${zoneIndex + 1} for ${band}`);

  const expected = expectedLoadoutForZone(tier, zoneIndex);
  const common = {
    weaponItemId,
    zoneDefId,
    segmentIndex,
    equipmentItemIds: equipmentFor(weaponItemId, expected.gearTier),
    masteryLevel: expected.masteryLevel,
    enchantment: expected.enchantment,
  } as const;

  const noPotion = runCombatRuntimeBenchmark({
    label: `t${tier}_z${zoneIndex + 1}_s${segmentIndex + 1}_no_potion`,
    ...common,
    useHealthPotions: false,
  });

  const withPotion = runCombatRuntimeBenchmark({
    label: `t${tier}_z${zoneIndex + 1}_s${segmentIndex + 1}_potion`,
    ...common,
    useHealthPotions: true,
  });

  return {
    tier,
    band,
    zoneIndex: zoneIndex + 1,
    zoneDefId,
    zone: zoneName(String(zoneDefId)),
    segment: segmentIndex + 1,
    weaponItemId,
    weapon: shortWeaponName(weaponItemId),
    gear: `T${expected.gearTier}.${expected.enchantment}`,
    mastery: expected.masteryLevel,
    clearNoPotion: noPotion.clear,
    hpNoPotion: noPotion.hpPercent,
    secondsNoPotion: noPotion.seconds,
    encountersNoPotion: noPotion.encounterReached,
    telemetryNoPotion: noPotion.encounters,
    clearPotion: withPotion.clear,
    hpPotion: withPotion.hpPercent,
    secondsPotion: withPotion.seconds,
    potionsUsed: withPotion.potionsUsed,
    encountersPotion: withPotion.encounterReached,
    telemetryPotion: withPotion.encounters,
  };
}

function firstWallSegment(rows: readonly SegmentRun[], potion: boolean): number | null {
  const wall = rows.find((row) => potion ? !row.clearPotion : !row.clearNoPotion);
  return wall?.segment ?? null;
}

function lastClearSegment(rows: readonly SegmentRun[], potion: boolean): number | null {
  const cleared = rows.filter((row) => potion ? row.clearPotion : row.clearNoPotion);
  return cleared.length === 0 ? null : cleared[cleared.length - 1]?.segment ?? null;
}

function fmt(segment: number | null): string {
  return segment === null ? "-" : `S${segment}`;
}

function nonMonotonicPairs(rows: readonly SegmentRun[], potion: boolean) {
  const pairs: Array<{ wall: SegmentRun; laterClear: SegmentRun; potion: boolean }> = [];
  const keys = new Map<string, SegmentRun[]>();

  for (const row of rows) {
    const key = `${row.tier}|${row.zoneIndex}|${row.weapon}`;
    const current = keys.get(key) ?? [];
    current.push(row);
    keys.set(key, current);
  }

  for (const group of keys.values()) {
    group.sort((a, b) => a.segment - b.segment);
    const firstWall = group.find((row) => potion ? !row.clearPotion : !row.clearNoPotion);
    if (firstWall === undefined) continue;
    const laterClears = group.filter((row) =>
      row.segment > firstWall.segment && (potion ? row.clearPotion : row.clearNoPotion),
    );
    const laterClear = laterClears[laterClears.length - 1];
    if (laterClear !== undefined) pairs.push({ wall: firstWall, laterClear, potion });
  }

  return pairs;
}

function traceEncounterRows(row: SegmentRun, potion: boolean) {
  const telemetry = potion ? row.telemetryPotion : row.telemetryNoPotion;
  return telemetry.map((encounter) => {
    const monster = resolveMonsterForEncounter(
      row.zoneDefId,
      row.segment - 1,
      encounter.encounterIndex - 1,
    );
    return {
      encounter: encounter.encounterIndex,
      monster: monster.name,
      faction: monster.faction,
      category: monster.category,
      damageType: monster.combat.damageType,
      monsterAbilities: monster.abilityIds.join(" + ") || "-",
      cleared: encounter.cleared,
      seconds: encounter.seconds,
      hpBefore: encounter.hpBeforePercent,
      hpAfter: encounter.hpAfterPercent,
      damageReceived: encounter.damageReceived,
      damageDealt: encounter.damageDealt,
      heroDps: encounter.observedDps,
      potions: encounter.potionsUsed,
    };
  });
}

function printDetailedAnomalyTrace(rows: readonly SegmentRun[]): void {
  const anomalies = [
    ...nonMonotonicPairs(rows, false),
    ...nonMonotonicPairs(rows, true),
  ];

  console.log("[T4_T8_NON_MONOTONIC_RUNTIME_ANOMALIES]");
  console.table(anomalies.map(({ wall, laterClear, potion }) => ({
    tier: wall.tier,
    zone: wall.zone,
    weapon: wall.weapon,
    mode: potion ? "potion" : "no_potion",
    wall: `S${wall.segment}`,
    laterClear: `S${laterClear.segment}`,
    wallEncountersReached: potion ? wall.encountersPotion : wall.encountersNoPotion,
    laterClearHp: potion ? laterClear.hpPotion : laterClear.hpNoPotion,
  })));

  for (const { wall, laterClear, potion } of anomalies) {
    const mode = potion ? "POTION" : "NO_POTION";
    console.log(
      `[NON_MONOTONIC_TRACE] T${wall.tier} | ${wall.zone} | ${wall.weapon} | ${mode} | S${wall.segment} WALL -> S${laterClear.segment} CLEAR`,
    );
    console.log("[WALL_SEGMENT_ENCOUNTERS]");
    console.table(traceEncounterRows(wall, potion));
    console.log("[LATER_CLEAR_SEGMENT_ENCOUNTERS]");
    console.table(traceEncounterRows(laterClear, potion));
  }
}

function buildLocator(rows: readonly SegmentRun[]) {
  return TARGET_TIERS.flatMap((tier) => {
    const { band, zoneIndices } = TIER_SWEEP_CONFIG[tier];
    return zoneIndices.flatMap((zoneIndex) => {
      const zoneDefId = WORLD_ZONE_IDS_BY_BAND[band][zoneIndex];
      if (zoneDefId === undefined) throw new Error(`Missing zone ${zoneIndex + 1} for ${band}`);
      const expected = expectedLoadoutForZone(tier, zoneIndex);

      return weaponItemIds(expected.gearTier).map((weaponItemId) => {
        const weapon = shortWeaponName(weaponItemId);
        const weaponRows = rows.filter((row) =>
          row.tier === tier
          && row.zoneIndex === zoneIndex + 1
          && row.weapon === weapon,
        );

        const firstWallNoPotion = firstWallSegment(weaponRows, false);
        const firstWallPotion = firstWallSegment(weaponRows, true);
        const lastClearNoPotion = lastClearSegment(weaponRows, false);
        const lastClearPotion = lastClearSegment(weaponRows, true);

        return {
          tier,
          band,
          zone: zoneName(String(zoneDefId)),
          weapon,
          gear: `T${expected.gearTier}.${expected.enchantment}`,
          mastery: expected.masteryLevel,
          lastClearNoPotion: fmt(lastClearNoPotion),
          firstWallNoPotion: fmt(firstWallNoPotion),
          lastClearPotion: fmt(lastClearPotion),
          firstWallPotion: fmt(firstWallPotion),
          potionGain: (lastClearPotion ?? 0) - (lastClearNoPotion ?? 0),
        };
      });
    });
  });
}

function buildZoneSummary(locator: ReturnType<typeof buildLocator>) {
  return TARGET_TIERS.flatMap((tier) => {
    const { band, zoneIndices } = TIER_SWEEP_CONFIG[tier];
    return zoneIndices.map((zoneIndex) => {
      const zoneDefId = WORLD_ZONE_IDS_BY_BAND[band][zoneIndex];
      if (zoneDefId === undefined) throw new Error(`Missing zone ${zoneIndex + 1} for ${band}`);
      const expected = expectedLoadoutForZone(tier, zoneIndex);
      const zone = zoneName(String(zoneDefId));
      const zoneRows = locator.filter((row) => row.tier === tier && row.zone === zone);
      const noPotionWalls = zoneRows
        .map((row) => Number(row.firstWallNoPotion.replace("S", "")))
        .filter(Number.isFinite);
      const potionWalls = zoneRows
        .map((row) => Number(row.firstWallPotion.replace("S", "")))
        .filter(Number.isFinite);

      return {
        tier,
        band,
        zone,
        gear: `T${expected.gearTier}.${expected.enchantment}`,
        mastery: expected.masteryLevel,
        earliestWallNoPotion: noPotionWalls.length === 0 ? "-" : `S${Math.min(...noPotionWalls)}`,
        latestWallNoPotion: noPotionWalls.length === 0 ? "-" : `S${Math.max(...noPotionWalls)}`,
        earliestWallPotion: potionWalls.length === 0 ? "-" : `S${Math.min(...potionWalls)}`,
        latestWallPotion: potionWalls.length === 0 ? "-" : `S${Math.max(...potionWalls)}`,
      };
    });
  });
}

interface GateCandidate {
  readonly gearTier: Tier;
  readonly enchantment: Enchantment;
  readonly expected: boolean;
}

interface GateRun {
  readonly tier: TargetTier;
  readonly band: BandId;
  readonly zone: string;
  readonly expectedGear: string;
  readonly testedGear: string;
  readonly undergeared: boolean;
  readonly weapon: string;
  readonly mastery: number;
  readonly clearNoPotion: boolean;
  readonly clearPotion: boolean;
  readonly hpPotion: number;
  readonly potionsUsed: number;
}

function gateCandidatesFor(expected: ZoneLoadoutExpectation): readonly GateCandidate[] {
  const candidates: GateCandidate[] = [];

  if (expected.gearTier > 3) {
    candidates.push({
      gearTier: (expected.gearTier - 1) as Tier,
      enchantment: 3,
      expected: false,
    });
  }

  for (let enchantment = 0; enchantment <= expected.enchantment; enchantment += 1) {
    candidates.push({
      gearTier: expected.gearTier,
      enchantment: enchantment as Enchantment,
      expected: enchantment === expected.enchantment,
    });
  }

  return candidates;
}

function buildGateRuns(): readonly GateRun[] {
  const rows: GateRun[] = [];

  for (const tier of TARGET_TIERS) {
    const { band, zoneIndices } = TIER_SWEEP_CONFIG[tier];
    for (const zoneIndex of zoneIndices) {
      const zoneDefId = WORLD_ZONE_IDS_BY_BAND[band][zoneIndex];
      if (zoneDefId === undefined) throw new Error(`Missing zone ${zoneIndex + 1} for ${band}`);
      const expected = expectedLoadoutForZone(tier, zoneIndex);
      const expectedGear = `T${expected.gearTier}.${expected.enchantment}`;

      for (const candidate of gateCandidatesFor(expected)) {
        for (const weaponItemId of weaponItemIds(candidate.gearTier)) {
          const common = {
            weaponItemId,
            zoneDefId,
            segmentIndex: FINAL_SEGMENT_INDEX,
            equipmentItemIds: equipmentFor(weaponItemId, candidate.gearTier),
            masteryLevel: expected.masteryLevel,
            enchantment: candidate.enchantment,
          } as const;

          const noPotion = runCombatRuntimeBenchmark({
            label: `tier_gate_t${tier}_z${zoneIndex + 1}_${candidate.gearTier}_${candidate.enchantment}_no_potion`,
            ...common,
            useHealthPotions: false,
          });
          const withPotion = runCombatRuntimeBenchmark({
            label: `tier_gate_t${tier}_z${zoneIndex + 1}_${candidate.gearTier}_${candidate.enchantment}_potion`,
            ...common,
            useHealthPotions: true,
          });

          rows.push({
            tier,
            band,
            zone: zoneName(String(zoneDefId)),
            expectedGear,
            testedGear: `T${candidate.gearTier}.${candidate.enchantment}`,
            undergeared: !candidate.expected,
            weapon: shortWeaponName(weaponItemId),
            mastery: expected.masteryLevel,
            clearNoPotion: noPotion.clear,
            clearPotion: withPotion.clear,
            hpPotion: withPotion.hpPercent,
            potionsUsed: withPotion.potionsUsed,
          });
        }
      }
    }
  }

  return rows;
}

function printTierGateValidation(rows: readonly GateRun[]): void {
  const anomalies = rows.filter((row) => row.undergeared && row.clearPotion);
  const expectedRows = rows.filter((row) => !row.undergeared);
  const expectedPasses = expectedRows.filter((row) => row.clearPotion).length;

  console.log("[T4_T8_TIER_GATE_SUMMARY]");
  console.table(TARGET_TIERS.flatMap((tier) => {
    const { band, zoneIndices } = TIER_SWEEP_CONFIG[tier];
    return zoneIndices.map((zoneIndex) => {
      const zoneDefId = WORLD_ZONE_IDS_BY_BAND[band][zoneIndex];
      if (zoneDefId === undefined) throw new Error(`Missing zone ${zoneIndex + 1} for ${band}`);
      const zone = zoneName(String(zoneDefId));
      const zoneRows = rows.filter((row) => row.tier === tier && row.zone === zone);
      const expected = expectedLoadoutForZone(tier, zoneIndex);
      const undergearRows = zoneRows.filter((row) => row.undergeared);
      const undergearPotionClears = undergearRows.filter((row) => row.clearPotion);
      const expectedZoneRows = zoneRows.filter((row) => !row.undergeared);
      const expectedPotionClears = expectedZoneRows.filter((row) => row.clearPotion);

      return {
        tier,
        band,
        zone,
        expectedGear: `T${expected.gearTier}.${expected.enchantment}`,
        expectedPotionPass: `${expectedPotionClears.length}/${expectedZoneRows.length}`,
        undergearPotionLeaks: `${undergearPotionClears.length}/${undergearRows.length}`,
        gate: undergearPotionClears.length === 0 ? "PASS" : "FAIL",
      };
    });
  }));

  console.log("[T4_T8_TIER_GATE_ANOMALIES]");
  console.table(anomalies.map((row) => ({
    tier: row.tier,
    zone: row.zone,
    expected: row.expectedGear,
    leakedGear: row.testedGear,
    weapon: row.weapon,
    mastery: row.mastery,
    potionClear: row.clearPotion,
    hp: row.hpPotion,
    potions: row.potionsUsed,
  })));

  console.log("[T4_T8_TIER_GATE_RESULT]", {
    gateRuns: rows.length * 2,
    expectedPotionPasses: `${expectedPasses}/${expectedRows.length}`,
    undergearedPotionLeaks: anomalies.length,
    status: anomalies.length === 0 ? "PASS" : "FAIL",
    rule: "A loadout below the authored zone requirement must not clear S10 even with potions. The authored loadout may clear with or without potions depending on weapon profile.",
  });
}

function main(): void {
  const rows: SegmentRun[] = [];

  for (const tier of TARGET_TIERS) {
    const { zoneIndices } = TIER_SWEEP_CONFIG[tier];
    for (const zoneIndex of zoneIndices) {
      const expected = expectedLoadoutForZone(tier, zoneIndex);
      for (const weaponItemId of weaponItemIds(expected.gearTier)) {
        for (let segmentIndex = 0; segmentIndex < SEGMENTS_PER_ZONE; segmentIndex += 1) {
          rows.push(runSegment(tier, zoneIndex, segmentIndex, weaponItemId));
        }
      }
    }
  }

  const locator = buildLocator(rows);
  const zoneSummary = buildZoneSummary(locator);
  const gateRows = buildGateRuns();
  const zonesInSweep = TARGET_TIERS.reduce(
    (total, tier) => total + TIER_SWEEP_CONFIG[tier].zoneIndices.length,
    0,
  );

  console.log("[T4_T8_EXHAUSTIVE_WALL_SWEEP_REFERENCE]");
  console.log({
    tiers: TARGET_TIERS,
    zonesInSweep,
    segmentsPerZone: SEGMENTS_PER_ZONE,
    weaponsPerSegment: WEAPON_FAMILIES.length,
    potionModesPerSegment: 2,
    totalRuntimeRuns: rows.length * 2,
    note: "Blue T4 uses validated late-zone reference loadouts; mastery references beyond Yellow remain diagnostic extrapolations, not frozen design law.",
  });

  console.log("[T4_T8_EXHAUSTIVE_ZONE_SUMMARY]");
  console.table(zoneSummary);

  for (const tier of TARGET_TIERS) {
    console.log(`[T${tier}_EXHAUSTIVE_WALL_LOCATOR]`);
    console.table(locator.filter((row) => row.tier === tier));
  }

  printDetailedAnomalyTrace(rows);
  printTierGateValidation(gateRows);

  console.log("[T4_T8_EXHAUSTIVE_WALL_SWEEP_RESULT]", {
    segmentRows: rows.length,
    runtimeRuns: rows.length * 2,
    locatorRows: locator.length,
    tierGateRows: gateRows.length,
    tierGateRuntimeRuns: gateRows.length * 2,
  });
}

main();
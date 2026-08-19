import { resolveEquipmentInfo } from "../apps/client/src/data/itemContentCatalog.js";
import { resolveMonsterForEncounter } from "../apps/client/src/data/monsterContentCatalog.js";
import {
  WORLD_ZONE_IDS_BY_BAND,
  ZONE_DEFINITIONS,
} from "../apps/client/src/data/worldContentCatalog.js";
import { runCombatRuntimeBenchmark } from "../apps/client/src/runtime/CombatRuntimeBenchmarkHarness.js";

type Tier = 4 | 5 | 6 | 7 | 8;
type TargetTier = 5 | 6 | 7 | 8;
type Enchantment = 0 | 1 | 2 | 3;
type BandId = "yellow" | "orange" | "red" | "black";
type EncounterTelemetry = ReturnType<typeof runCombatRuntimeBenchmark>["encounters"];

const BAND_BY_TIER: Readonly<Record<TargetTier, BandId>> = {
  5: "yellow",
  6: "orange",
  7: "red",
  8: "black",
};

const WEAPON_FAMILIES = [
  ["sword", "broadsword"],
  ["bow", "longbow"],
  ["staff", "infernal"],
  ["gloves", "spiked_gauntlets"],
  ["dagger", "pair"],
] as const;

const SEGMENTS_PER_ZONE = 10;

function weaponItemIds(tier: Tier): readonly string[] {
  return WEAPON_FAMILIES.map(([family, specialization]) =>
    `item_weapon_${family}_t${String(tier)}_${specialization}`,
  );
}

function armorItemIds(tier: Tier): readonly string[] {
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

function masteryBaseForTier(tier: TargetTier): number {
  return 25 + (tier - 5) * 15;
}

interface ZoneLoadoutExpectation {
  readonly gearTier: Tier;
  readonly enchantment: Enchantment;
  readonly masteryLevel: number;
}

function expectedLoadoutForZone(tier: TargetTier, zoneIndex: number): ZoneLoadoutExpectation {
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
  const band = BAND_BY_TIER[tier];
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

  console.log("[T5_T8_NON_MONOTONIC_RUNTIME_ANOMALIES]");
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

function main(): void {
  const rows: SegmentRun[] = [];

  for (const tier of [5, 6, 7, 8] as const) {
    for (let zoneIndex = 0; zoneIndex < 5; zoneIndex += 1) {
      const expected = expectedLoadoutForZone(tier, zoneIndex);
      for (const weaponItemId of weaponItemIds(expected.gearTier)) {
        for (let segmentIndex = 0; segmentIndex < SEGMENTS_PER_ZONE; segmentIndex += 1) {
          rows.push(runSegment(tier, zoneIndex, segmentIndex, weaponItemId));
        }
      }
    }
  }

  const locator = ([5, 6, 7, 8] as const).flatMap((tier) =>
    Array.from({ length: 5 }, (_, zoneIndex) => {
      const band = BAND_BY_TIER[tier];
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
    }).flat(),
  );

  const zoneSummary = ([5, 6, 7, 8] as const).flatMap((tier) =>
    Array.from({ length: 5 }, (_, zoneIndex) => {
      const band = BAND_BY_TIER[tier];
      const zoneDefId = WORLD_ZONE_IDS_BY_BAND[band][zoneIndex];
      if (zoneDefId === undefined) throw new Error(`Missing zone ${zoneIndex + 1} for ${band}`);
      const expected = expectedLoadoutForZone(tier, zoneIndex);
      const zoneRows = locator.filter((row) => row.tier === tier && row.zone === zoneName(String(zoneDefId)));
      const noPotionWalls = zoneRows
        .map((row) => Number(row.firstWallNoPotion.replace("S", "")))
        .filter(Number.isFinite);
      const potionWalls = zoneRows
        .map((row) => Number(row.firstWallPotion.replace("S", "")))
        .filter(Number.isFinite);

      return {
        tier,
        band,
        zone: zoneName(String(zoneDefId)),
        gear: `T${expected.gearTier}.${expected.enchantment}`,
        mastery: expected.masteryLevel,
        earliestWallNoPotion: noPotionWalls.length === 0 ? "-" : `S${Math.min(...noPotionWalls)}`,
        latestWallNoPotion: noPotionWalls.length === 0 ? "-" : `S${Math.max(...noPotionWalls)}`,
        earliestWallPotion: potionWalls.length === 0 ? "-" : `S${Math.min(...potionWalls)}`,
        latestWallPotion: potionWalls.length === 0 ? "-" : `S${Math.max(...potionWalls)}`,
      };
    }),
  );

  console.log("[T5_T8_EXHAUSTIVE_WALL_SWEEP_REFERENCE]");
  console.log({
    tiers: [5, 6, 7, 8],
    zonesPerTier: 5,
    segmentsPerZone: SEGMENTS_PER_ZONE,
    weaponsPerSegment: WEAPON_FAMILIES.length,
    potionModesPerSegment: 2,
    totalRuntimeRuns: rows.length * 2,
    note: "Mastery references beyond Yellow remain diagnostic extrapolations, not frozen design law.",
  });

  console.log("[T5_T8_EXHAUSTIVE_ZONE_SUMMARY]");
  console.table(zoneSummary);

  for (const tier of [5, 6, 7, 8] as const) {
    console.log(`[T${tier}_EXHAUSTIVE_WALL_LOCATOR]`);
    console.table(locator.filter((row) => row.tier === tier));
  }

  printDetailedAnomalyTrace(rows);

  console.log("[T5_T8_EXHAUSTIVE_WALL_SWEEP_RESULT]", {
    segmentRows: rows.length,
    runtimeRuns: rows.length * 2,
    locatorRows: locator.length,
  });
}

main();

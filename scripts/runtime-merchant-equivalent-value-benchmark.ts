import {
  ARTIFACT_FRAGMENTS_PER_CRAFT_CHARGE,
  DUNGEON_COMPLETION_SILVER_BY_TIER,
  DUNGEON_ENCOUNTER_LOOT_BY_TIER,
  GENERALIST_EXPEDITION_REWARD_PROFILES,
  KEY_FRAGMENTS_PER_KEY,
} from "../packages/data/src/index.js";
import { getEncounterRewards } from "../packages/gameplay/src/index.js";
import {
  getCombatLootExpectations,
  getDungeonKeyProgressionWeight,
  getEnchantmentShardProgressionWeight,
} from "../apps/client/src/data/economyContentCatalog.js";
import {
  DUNGEON_DEFINITIONS,
} from "../apps/client/src/data/dungeonContentCatalog.js";
import {
  resolveEquipmentInfo,
} from "../apps/client/src/data/itemContentCatalog.js";
import {
  WORLD_ZONE_IDS_BY_BAND,
  ZONE_DEFINITIONS,
} from "../apps/client/src/data/worldContentCatalog.js";
import {
  runCombatRuntimeBenchmark,
  type BenchmarkEnchantment,
} from "../apps/client/src/runtime/CombatRuntimeBenchmarkHarness.js";

type Tier = 4 | 5 | 6 | 7 | 8;
type BandId = "blue" | "yellow" | "orange" | "red" | "black";

interface TierConfig {
  readonly band: BandId;
  readonly zoneIndices: readonly number[];
  readonly generalistSlots: 1 | 2;
}

/**
 * T6+ assumes Cartography III is completed, which is the authored source of the
 * second expedition slot. This benchmark values merchant shortcuts against the
 * economy available at the same tier, not against a fresh-on-tier character.
 */
const TIER_CONFIG: Readonly<Record<Tier, TierConfig>> = {
  4: { band: "blue", zoneIndices: [3, 4], generalistSlots: 1 },
  5: { band: "yellow", zoneIndices: [0, 1, 2, 3, 4], generalistSlots: 1 },
  6: { band: "orange", zoneIndices: [0, 1, 2, 3, 4], generalistSlots: 2 },
  7: { band: "red", zoneIndices: [0, 1, 2, 3, 4], generalistSlots: 2 },
  8: { band: "black", zoneIndices: [0, 1, 2, 3, 4], generalistSlots: 2 },
};

const TIERS = [4, 5, 6, 7, 8] as const satisfies readonly Tier[];
const SEGMENTS_PER_ZONE = 10;
const MERCHANT_PREMIUM = 1.15;

const WEAPON_FAMILIES = [
  ["sword", "broadsword"],
  ["bow", "longbow"],
  ["staff", "infernal"],
  ["gloves", "spiked_gauntlets"],
  ["dagger", "pair"],
] as const;

interface LoadoutExpectation {
  readonly enchantment: BenchmarkEnchantment;
  readonly mastery: number;
}

interface WorldFarmCandidate {
  readonly zone: string;
  readonly segment: number;
  readonly combatSilverPerHour: number;
  readonly shardPerHour: number;
  readonly keyFragmentPerHour: number;
  readonly directKeyPerHour: number;
  readonly keyEquivalentPerHour: number;
}

function expectedLoadout(tier: Tier, zoneIndex: number): LoadoutExpectation {
  if (tier === 4) {
    if (zoneIndex === 3) return { enchantment: 1, mastery: 25 };
    if (zoneIndex === 4) return { enchantment: 2, mastery: 30 };
    throw new Error(`Unexpected T4 zone index ${String(zoneIndex)}`);
  }

  const baseMastery = 25 + (tier - 5) * 15;
  switch (zoneIndex) {
    case 0: return { enchantment: 0, mastery: baseMastery };
    case 1: return { enchantment: 0, mastery: baseMastery + 2 };
    case 2: return { enchantment: 1, mastery: baseMastery + 4 };
    case 3: return { enchantment: 2, mastery: baseMastery + 7 };
    case 4: return { enchantment: 2, mastery: baseMastery + 10 };
    default: throw new Error(`Unexpected zone index ${String(zoneIndex)}`);
  }
}

function dungeonMastery(tier: Tier): number {
  if (tier === 4) return 30;
  return 35 + (tier - 5) * 15;
}

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

function equipmentFor(weaponItemId: string, tier: Tier): readonly string[] {
  const equipment = [...armorItemIds(tier)];
  if (resolveEquipmentInfo(weaponItemId)?.handling === "one_handed") {
    equipment.push(`item_shield_t${String(tier)}_reinforced`);
  }
  return equipment;
}

function zoneName(zoneDefId: string): string {
  return ZONE_DEFINITIONS.find(({ id }) => String(id) === zoneDefId)?.name ?? zoneDefId;
}

function median(values: readonly number[]): number {
  const sorted = [...values].filter(Number.isFinite).sort((a, b) => a - b);
  if (sorted.length === 0) return 0;
  const middle = Math.floor(sorted.length / 2);
  if (sorted.length % 2 === 1) return sorted[middle] ?? 0;
  return ((sorted[middle - 1] ?? 0) + (sorted[middle] ?? 0)) / 2;
}

function round(value: number, digits = 2): number {
  return Number(value.toFixed(digits));
}

function roundMerchantPrice(value: number): number {
  if (!Number.isFinite(value) || value <= 0) return 0;
  const step = value < 25_000 ? 500 : value < 250_000 ? 2_500 : 5_000;
  return Math.max(step, Math.round(value / step) * step);
}

function buildWorldCandidate(
  tier: Tier,
  zoneIndex: number,
  segmentIndex: number,
  weaponItemId: string,
): WorldFarmCandidate | null {
  const config = TIER_CONFIG[tier];
  const zoneDefId = WORLD_ZONE_IDS_BY_BAND[config.band][zoneIndex];
  if (zoneDefId === undefined) return null;
  const loadout = expectedLoadout(tier, zoneIndex);
  const runtime = runCombatRuntimeBenchmark({
    label: `merchant_value_t${tier}_z${zoneIndex + 1}_s${segmentIndex + 1}_${weaponItemId}`,
    weaponItemId,
    zoneDefId,
    segmentIndex,
    equipmentItemIds: equipmentFor(weaponItemId, tier),
    masteryLevel: loadout.mastery,
    enchantment: loadout.enchantment,
    useHealthPotions: false,
  });
  if (!runtime.clear || runtime.seconds <= 0) return null;

  const hoursPerSegment = runtime.seconds / 3600;
  const enchantmentDropWeight = getEnchantmentShardProgressionWeight(
    config.band,
    zoneIndex,
    segmentIndex,
  );
  const dungeonKeyDropWeight = getDungeonKeyProgressionWeight(
    config.band,
    zoneIndex,
    segmentIndex,
  );

  let silverPerSegment = 0;
  let shardsPerSegment = 0;
  let keyFragmentsPerSegment = 0;
  let directKeysPerSegment = 0;

  for (let encounterIndex = 0; encounterIndex < 5; encounterIndex += 1) {
    const isSpecial = encounterIndex === 4;
    const isBoss = isSpecial && segmentIndex === 9;
    const isElite = isSpecial && segmentIndex < 9;
    silverPerSegment += getEncounterRewards(
      zoneIndex,
      segmentIndex,
      encounterIndex,
      config.band,
    ).silver;

    const expectations = getCombatLootExpectations({
      segmentIndex,
      faction: "benchmark",
      isElite,
      isBoss,
      isFinalBoss: isBoss,
      enchantmentTier: tier,
      enchantmentDropWeight,
      dungeonKeyDropWeight,
    });
    for (const expectation of expectations) {
      if (expectation.kind === "enchantment") shardsPerSegment += expectation.expectedQuantity;
      else if (expectation.kind === "key_fragment") keyFragmentsPerSegment += expectation.expectedQuantity;
      else if (expectation.kind === "key") directKeysPerSegment += expectation.expectedQuantity;
    }
  }

  const keyEquivalentPerSegment = directKeysPerSegment + keyFragmentsPerSegment / KEY_FRAGMENTS_PER_KEY;
  return {
    zone: zoneName(String(zoneDefId)),
    segment: segmentIndex + 1,
    combatSilverPerHour: silverPerSegment / hoursPerSegment,
    shardPerHour: shardsPerSegment / hoursPerSegment,
    keyFragmentPerHour: keyFragmentsPerSegment / hoursPerSegment,
    directKeyPerHour: directKeysPerSegment / hoursPerSegment,
    keyEquivalentPerHour: keyEquivalentPerSegment / hoursPerSegment,
  };
}

function bestWorldCandidate(
  tier: Tier,
  weaponItemId: string,
  score: (candidate: WorldFarmCandidate) => number,
): WorldFarmCandidate | null {
  const config = TIER_CONFIG[tier];
  let best: WorldFarmCandidate | null = null;
  for (const zoneIndex of config.zoneIndices) {
    for (let segmentIndex = 0; segmentIndex < SEGMENTS_PER_ZONE; segmentIndex += 1) {
      const candidate = buildWorldCandidate(tier, zoneIndex, segmentIndex, weaponItemId);
      if (candidate === null) continue;
      if (best === null || score(candidate) > score(best)) best = candidate;
    }
  }
  return best;
}

function benchmarkDungeonSeconds(tier: Tier): readonly number[] {
  const dungeons = DUNGEON_DEFINITIONS.filter((dungeon) => dungeon.tier === tier);
  const config = TIER_CONFIG[tier];
  const zoneDefId = WORLD_ZONE_IDS_BY_BAND[config.band][4];
  if (zoneDefId === undefined) throw new Error(`Missing deepest ${config.band} zone`);
  const rows: number[] = [];

  for (const dungeon of dungeons) {
    for (const weaponItemId of weaponItemIds(tier)) {
      const runtime = runCombatRuntimeBenchmark({
        label: `merchant_artifact_t${tier}_${dungeon.id}_${weaponItemId}`,
        weaponItemId,
        zoneDefId,
        segmentIndex: 9,
        dungeonDefinitionId: dungeon.id,
        equipmentItemIds: equipmentFor(weaponItemId, tier),
        masteryLevel: dungeonMastery(tier),
        enchantment: 3,
        useHealthPotions: true,
      });
      if (runtime.clear && runtime.seconds > 0) rows.push(runtime.seconds);
    }
  }
  return rows;
}

function main(): void {
  const rows: Array<Record<string, string | number>> = [];

  for (const tier of TIERS) {
    const config = TIER_CONFIG[tier];
    const expedition = GENERALIST_EXPEDITION_REWARD_PROFILES[tier];
    const expeditionSilverPerHour = expedition.silverPerHour * config.generalistSlots;
    const expeditionShardsPerHour = expedition.shardsPerHour * config.generalistSlots;

    const shardCandidates = weaponItemIds(tier)
      .map((weapon) => bestWorldCandidate(
        tier,
        weapon,
        (candidate) => candidate.shardPerHour + expeditionShardsPerHour,
      ))
      .filter((candidate): candidate is WorldFarmCandidate => candidate !== null);
    const fragmentCandidates = weaponItemIds(tier)
      .map((weapon) => bestWorldCandidate(tier, weapon, (candidate) => candidate.keyFragmentPerHour))
      .filter((candidate): candidate is WorldFarmCandidate => candidate !== null);
    const keyCandidates = weaponItemIds(tier)
      .map((weapon) => bestWorldCandidate(tier, weapon, (candidate) => candidate.keyEquivalentPerHour))
      .filter((candidate): candidate is WorldFarmCandidate => candidate !== null);

    const medianShardCombatRate = median(shardCandidates.map((candidate) => candidate.shardPerHour));
    const totalShardRate = medianShardCombatRate + expeditionShardsPerHour;
    const medianShardCombatSilver = median(shardCandidates.map((candidate) => candidate.combatSilverPerHour));
    const shardSilverPerHour = medianShardCombatSilver + expeditionSilverPerHour;
    const shardRawValue = totalShardRate > 0 ? shardSilverPerHour / totalShardRate : 0;

    const medianFragmentRate = median(fragmentCandidates.map((candidate) => candidate.keyFragmentPerHour));
    const medianFragmentCombatSilver = median(fragmentCandidates.map((candidate) => candidate.combatSilverPerHour));
    const fragmentSilverPerHour = medianFragmentCombatSilver + expeditionSilverPerHour;
    const keyFragmentRawValue = medianFragmentRate > 0 ? fragmentSilverPerHour / medianFragmentRate : 0;

    const medianKeyRate = median(keyCandidates.map((candidate) => candidate.keyEquivalentPerHour));
    const medianKeyCombatSilver = median(keyCandidates.map((candidate) => candidate.combatSilverPerHour));
    const keySilverPerHour = medianKeyCombatSilver + expeditionSilverPerHour;
    const keyFarmHours = medianKeyRate > 0 ? 1 / medianKeyRate : 0;
    const keyRawValue = keyFarmHours * keySilverPerHour;

    const dungeonSeconds = benchmarkDungeonSeconds(tier);
    const medianDungeonSeconds = median(dungeonSeconds);
    const dungeonHours = medianDungeonSeconds / 3600;
    const dungeonLoot = DUNGEON_ENCOUNTER_LOOT_BY_TIER[tier];
    const artifactFragmentsPerRun = (
      dungeonLoot.normal.artifactFragmentQuantity * 2
      + dungeonLoot.elite.artifactFragmentQuantity
      + dungeonLoot.boss.artifactFragmentQuantity
    );
    const directArtifactChancePerRun = (
      dungeonLoot.normal.artifactDropChance * 2
      + dungeonLoot.elite.artifactDropChance
      + dungeonLoot.boss.artifactDropChance
    );
    const artifactEquivalentPerRun = (
      artifactFragmentsPerRun / ARTIFACT_FRAGMENTS_PER_CRAFT_CHARGE
      + directArtifactChancePerRun
    );

    const cycleHours = keyFarmHours + dungeonHours;
    const cycleSilver = (
      keyFarmHours * keySilverPerHour
      + dungeonHours * expeditionSilverPerHour
      + DUNGEON_COMPLETION_SILVER_BY_TIER[tier]
    );
    const artifactFragmentRawValue = artifactFragmentsPerRun > 0
      ? cycleSilver / artifactFragmentsPerRun
      : 0;
    const artifactRawValue = artifactEquivalentPerRun > 0
      ? cycleSilver / artifactEquivalentPerRun
      : 0;
    const artifactFarmHours = artifactEquivalentPerRun > 0
      ? cycleHours / artifactEquivalentPerRun
      : 0;

    rows.push({
      tier: `T${tier}`,
      expeditionSlots: config.generalistSlots,
      expeditionSilverH: expeditionSilverPerHour,
      expeditionShardsH: expeditionShardsPerHour,
      shardCombatH: round(medianShardCombatRate),
      shardTotalH: round(totalShardRate),
      shardValueRaw: Math.round(shardRawValue),
      shardMerchant15: roundMerchantPrice(shardRawValue * MERCHANT_PREMIUM),
      keyFragmentH: round(medianFragmentRate),
      keyFragmentValueRaw: Math.round(keyFragmentRawValue),
      keyFragmentMerchant15: roundMerchantPrice(keyFragmentRawValue * MERCHANT_PREMIUM),
      keyEquivalentH: round(medianKeyRate, 3),
      keyFarmTime: round(keyFarmHours, 2),
      keyValueRaw: Math.round(keyRawValue),
      keyMerchant15: roundMerchantPrice(keyRawValue * MERCHANT_PREMIUM),
      dungeonClearSamples: `${String(dungeonSeconds.length)}/20`,
      dungeonMedianMinutes: round(medianDungeonSeconds / 60, 1),
      artifactFragmentsRun: artifactFragmentsPerRun,
      artifactDirectChancePct: round(directArtifactChancePerRun * 100, 1),
      artifactEquivalentRun: round(artifactEquivalentPerRun, 3),
      artifactFarmHours: round(artifactFarmHours, 2),
      artifactFragmentValueRaw: Math.round(artifactFragmentRawValue),
      artifactFragmentMerchant15: roundMerchantPrice(artifactFragmentRawValue * MERCHANT_PREMIUM),
      artifactValueRaw: Math.round(artifactRawValue),
      artifactMerchant15: roundMerchantPrice(artifactRawValue * MERCHANT_PREMIUM),
    });
  }

  console.log("[MERCHANT_EQUIVALENT_VALUE_ASSUMPTIONS]");
  console.log({
    merchantPremium: MERCHANT_PREMIUM,
    keyFragmentsPerKey: KEY_FRAGMENTS_PER_KEY,
    artifactFragmentsPerCraftCharge: ARTIFACT_FRAGMENTS_PER_CRAFT_CHARGE,
    generalistSlots: Object.fromEntries(TIERS.map((tier) => [tier, TIER_CONFIG[tier].generalistSlots])),
    shardValue: "Best accessible world shard farm per weapon + simultaneous generalist expedition shards; Silver includes combat + simultaneous generalist expeditions.",
    keyValue: "Best accessible world key-equivalent farm per weapon; direct key drops + fragments/50 are combined. Silver includes combat + simultaneous generalist expeditions.",
    artifactValue: "Each dungeon run consumes one farmed key. Value includes key-farm time + median live dungeon clear time + dungeon completion Silver + simultaneous generalist expedition Silver. Artifact EV combines direct artifact chance + fragments/200.",
    factionYieldBonus: "0% baseline; faction mastery would shorten acquisition time and therefore lower equivalent merchant value.",
  });

  console.log("[MERCHANT_EQUIVALENT_VALUE_T4_T8]");
  console.table(rows);
}

main();

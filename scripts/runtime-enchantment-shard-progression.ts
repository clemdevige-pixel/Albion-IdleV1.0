import { ENCHANTMENT_SHARD_COSTS } from "../packages/gameplay/src/equipment/enchantment-recipes.js";
import {
  resolveEnchantmentItemInfo,
  resolveEquipmentInfo,
} from "../apps/client/src/data/itemContentCatalog.js";
import {
  WORLD_ZONE_IDS_BY_BAND,
  ZONE_DEFINITIONS,
} from "../apps/client/src/data/worldContentCatalog.js";
import { runEnchantmentShardTtkBenchmark } from "../apps/client/src/data/enchantmentShardTtkBenchmark.js";

type Tier = 4 | 5 | 6 | 7 | 8;
type BandId = "blue" | "yellow" | "orange" | "red" | "black";
type Enchantment = 0 | 1 | 2 | 3;
type Transition = 1 | 2 | 3 | 4;

interface TierConfig {
  readonly band: BandId;
  readonly zoneIndices: readonly number[];
}

const TIER_CONFIG: Readonly<Record<Tier, TierConfig>> = {
  4: { band: "blue", zoneIndices: [3, 4] },
  5: { band: "yellow", zoneIndices: [0, 1, 2, 3, 4] },
  6: { band: "orange", zoneIndices: [0, 1, 2, 3, 4] },
  7: { band: "red", zoneIndices: [0, 1, 2, 3, 4] },
  8: { band: "black", zoneIndices: [0, 1, 2, 3, 4] },
};

const TIERS = [4, 5, 6, 7, 8] as const satisfies readonly Tier[];
const SEGMENTS_PER_ZONE = 10;

const WEAPON_FAMILIES = [
  ["sword", "broadsword"],
  ["bow", "longbow"],
  ["staff", "infernal"],
  ["gloves", "spiked_gauntlets"],
  ["dagger", "pair"],
] as const;

interface LoadoutExpectation {
  readonly enchantment: Enchantment;
  readonly mastery: number;
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

function weaponShardCost(weaponItemId: string, level: Transition): number {
  const info = resolveEnchantmentItemInfo(weaponItemId);
  if (info === undefined) throw new Error(`Missing enchantment info for ${weaponItemId}`);
  return ENCHANTMENT_SHARD_COSTS[info.costCategory][level];
}

function shortWeaponName(itemId: string): string {
  return itemId.replace("item_weapon_", "").replace(/_t\d_/, " ");
}

function zoneName(zoneDefId: string): string {
  return ZONE_DEFINITIONS.find(({ id }) => String(id) === zoneDefId)?.name ?? zoneDefId;
}

interface FarmCandidate {
  readonly zoneIndex: number;
  readonly zone: string;
  readonly segment: number;
  readonly shardsPerHour: number;
  readonly seconds: number;
  readonly potionsUsed: number;
}

function bestFarmCandidate(
  tier: Tier,
  targetZoneIndex: number,
  weaponItemId: string,
  loadout: LoadoutExpectation,
  useHealthPotions: boolean,
): FarmCandidate | null {
  const { band, zoneIndices } = TIER_CONFIG[tier];
  const candidateZoneIndices = zoneIndices.filter((zoneIndex) => zoneIndex <= targetZoneIndex);
  let best: FarmCandidate | null = null;

  for (const zoneIndex of candidateZoneIndices) {
    const zoneDefId = WORLD_ZONE_IDS_BY_BAND[band][zoneIndex];
    if (zoneDefId === undefined) continue;

    for (let segmentIndex = 0; segmentIndex < SEGMENTS_PER_ZONE; segmentIndex += 1) {
      const result = runEnchantmentShardTtkBenchmark({
        label: `shard_t${tier}_z${zoneIndex + 1}_s${segmentIndex + 1}_${useHealthPotions ? "potion" : "afk"}`,
        weaponItemId,
        zoneDefId,
        segmentIndex,
        equipmentItemIds: equipmentFor(weaponItemId, tier),
        masteryLevel: loadout.mastery,
        enchantment: loadout.enchantment,
        useHealthPotions,
      });

      if (!result.clear || result.expectedShardsPerHour <= 0) continue;
      const candidate: FarmCandidate = {
        zoneIndex: zoneIndex + 1,
        zone: zoneName(String(zoneDefId)),
        segment: segmentIndex + 1,
        shardsPerHour: result.expectedShardsPerHour,
        seconds: result.seconds,
        potionsUsed: result.potionsUsed,
      };
      if (best === null || candidate.shardsPerHour > best.shardsPerHour) best = candidate;
    }
  }

  return best;
}

function hoursFor(shards: number, rate: number): number | null {
  return rate > 0 ? shards / rate : null;
}

function fmtHours(hours: number | null): string {
  if (hours === null || !Number.isFinite(hours)) return "∞";
  if (hours < 1) return `${Math.round(hours * 60)}m`;
  return `${hours.toFixed(2)}h`;
}

function median(values: readonly number[]): number {
  const sorted = [...values].sort((a, b) => a - b);
  if (sorted.length === 0) return 0;
  const middle = Math.floor(sorted.length / 2);
  if (sorted.length % 2 === 1) return sorted[middle] ?? 0;
  return ((sorted[middle - 1] ?? 0) + (sorted[middle] ?? 0)) / 2;
}

function main(): void {
  const detailRows: Array<Record<string, string | number>> = [];

  for (const tier of TIERS) {
    const { band, zoneIndices } = TIER_CONFIG[tier];
    for (const zoneIndex of zoneIndices) {
      const targetZoneDefId = WORLD_ZONE_IDS_BY_BAND[band][zoneIndex];
      if (targetZoneDefId === undefined) throw new Error(`Missing ${band} zone ${zoneIndex + 1}`);
      const loadout = expectedLoadout(tier, zoneIndex);

      for (const weaponItemId of weaponItemIds(tier)) {
        const afk = bestFarmCandidate(tier, zoneIndex, weaponItemId, loadout, false);
        const active = bestFarmCandidate(tier, zoneIndex, weaponItemId, loadout, true);
        const afkRate = afk?.shardsPerHour ?? 0;
        const activeRate = active?.shardsPerHour ?? 0;
        const nextLevel = Math.min(4, loadout.enchantment + 1) as Transition;
        const nextCost = weaponShardCost(weaponItemId, nextLevel);

        detailRows.push({
          tier,
          band,
          targetZone: zoneName(String(targetZoneDefId)),
          gear: `T${tier}.${loadout.enchantment}`,
          mastery: loadout.mastery,
          weapon: shortWeaponName(weaponItemId),
          afkFarm: afk === null ? "-" : `${afk.zone} S${afk.segment}`,
          afkShardsH: Number(afkRate.toFixed(2)),
          activeFarm: active === null ? "-" : `${active.zone} S${active.segment}`,
          activeShardsH: Number(activeRate.toFixed(2)),
          activePotionsPerSegment: active?.potionsUsed ?? 0,
          nextStep: `.${loadout.enchantment}->.${nextLevel}`,
          nextCost,
          afkNextTime: fmtHours(hoursFor(nextCost, afkRate)),
          activeNextTime: fmtHours(hoursFor(nextCost, activeRate)),
          afkTo1: fmtHours(hoursFor(weaponShardCost(weaponItemId, 1), afkRate)),
          afkTo2: fmtHours(hoursFor(weaponShardCost(weaponItemId, 2), afkRate)),
          afkTo3: fmtHours(hoursFor(weaponShardCost(weaponItemId, 3), afkRate)),
          afkTo4: fmtHours(hoursFor(weaponShardCost(weaponItemId, 4), afkRate)),
        });
      }
    }
  }

  const summaryRows = TIERS.flatMap((tier) => {
    const { band, zoneIndices } = TIER_CONFIG[tier];
    return zoneIndices.map((zoneIndex) => {
      const zoneDefId = WORLD_ZONE_IDS_BY_BAND[band][zoneIndex];
      if (zoneDefId === undefined) throw new Error(`Missing ${band} zone ${zoneIndex + 1}`);
      const loadout = expectedLoadout(tier, zoneIndex);
      const zone = zoneName(String(zoneDefId));
      const rows = detailRows.filter((row) => row.tier === tier && row.targetZone === zone);
      const afkRates = rows.map((row) => Number(row.afkShardsH)).filter((rate) => rate > 0);
      const activeRates = rows.map((row) => Number(row.activeShardsH)).filter((rate) => rate > 0);
      const costs = rows.map((row) => Number(row.nextCost));
      const afkTimes = rows
        .map((row) => hoursFor(Number(row.nextCost), Number(row.afkShardsH)))
        .filter((value): value is number => value !== null);
      const activeTimes = rows
        .map((row) => hoursFor(Number(row.nextCost), Number(row.activeShardsH)))
        .filter((value): value is number => value !== null);

      return {
        tier,
        band,
        zone,
        gear: `T${tier}.${loadout.enchantment}`,
        nextStep: `.${loadout.enchantment}->.${Math.min(4, loadout.enchantment + 1)}`,
        shardCostMin: Math.min(...costs),
        shardCostMax: Math.max(...costs),
        afkFarmableWeapons: `${afkRates.length}/5`,
        medianAfkShardsH: Number(median(afkRates).toFixed(2)),
        medianAfkTime: fmtHours(median(afkTimes)),
        activeFarmableWeapons: `${activeRates.length}/5`,
        medianActiveShardsH: Number(median(activeRates).toFixed(2)),
        medianActiveTime: fmtHours(median(activeTimes)),
      };
    });
  });

  console.log("[ENCHANTMENT_SHARD_T4_T8_REFERENCE]");
  console.log({
    costs: ENCHANTMENT_SHARD_COSTS,
    note: "Shard costs are authored by equipment category. T5-T8 use the same category table; rates differ through live runtime TTK and farmability.",
  });

  console.log("[ENCHANTMENT_SHARD_T4_T8_ZONE_SUMMARY]");
  console.table(summaryRows);

  console.log("[ENCHANTMENT_SHARD_T4_T8_WEAPON_DETAIL]");
  console.table(detailRows);
}

main();

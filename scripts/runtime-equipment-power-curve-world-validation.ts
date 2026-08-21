import {
  ENCHANTMENT_STAT_MULTIPLIER,
  getEquipmentStatRoundingStep,
  roundEquipmentStatValue,
  type EquipmentInfoLike,
  type StatId,
} from "@game/gameplay";
import { ITEM_DEFINITIONS, resolveEquipmentInfo } from "../apps/client/src/data/itemContentCatalog.js";
import { PROGRESSION_EQUIPMENT_CONTENT } from "../apps/client/src/data/nonWeaponEquipmentContentCatalog.js";

type Tier = 4 | 5 | 6 | 7 | 8;
type MutableEquipmentDefinition = EquipmentInfoLike & { stats?: Record<string, number> };

type EquipmentFamily = {
  readonly familyId: string;
  readonly itemIdForTier: (tier: Tier) => string;
};

const TIERS = [4, 5, 6, 7, 8] as const satisfies readonly Tier[];
const MODELED_STATS = new Set([
  "stat_physical_damage",
  "stat_magical_damage",
  "stat_max_health",
  "stat_armor",
  "stat_magic_resistance",
]);

const WEAPON_FAMILIES: readonly EquipmentFamily[] = [
  { familyId: "broadsword", itemIdForTier: (tier) => `item_weapon_sword_t${String(tier)}_broadsword` },
  { familyId: "longbow", itemIdForTier: (tier) => `item_weapon_bow_t${String(tier)}_longbow` },
  { familyId: "infernal", itemIdForTier: (tier) => `item_weapon_staff_t${String(tier)}_infernal` },
  { familyId: "spiked_gauntlets", itemIdForTier: (tier) => `item_weapon_gloves_t${String(tier)}_spiked_gauntlets` },
  { familyId: "dagger_pair", itemIdForTier: (tier) => `item_weapon_dagger_t${String(tier)}_pair` },
];

const NON_WEAPON_FAMILIES: readonly EquipmentFamily[] = PROGRESSION_EQUIPMENT_CONTENT.map((family) => ({
  familyId: family.familyId,
  itemIdForTier: (tier: Tier) => {
    const item = family.items.find((candidate) => candidate.tier === tier);
    if (item === undefined) throw new Error(`Missing ${family.familyId} T${String(tier)}`);
    return item.itemId;
  },
}));

const EQUIPMENT_FAMILIES = [...WEAPON_FAMILIES, ...NON_WEAPON_FAMILIES] as const;

function median(values: readonly number[]): number {
  if (values.length === 0) throw new Error("Cannot compute median of empty values");
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  if (sorted.length % 2 === 1) return sorted[middle] ?? 0;
  return ((sorted[middle - 1] ?? 0) + (sorted[middle] ?? 0)) / 2;
}

function statsFor(itemId: string): Readonly<Record<string, number>> {
  const stats = resolveEquipmentInfo(itemId)?.stats;
  if (stats === undefined) throw new Error(`Missing equipment stats for ${itemId}`);
  return Object.fromEntries(
    Object.entries(stats).filter(([statId, value]) => MODELED_STATS.has(statId) && value > 0),
  );
}

function deriveTierGrowthFactor(): number {
  const familyFactors = EQUIPMENT_FAMILIES.map((family) => {
    const t4 = statsFor(family.itemIdForTier(4));
    const t8 = statsFor(family.itemIdForTier(8));
    const statFactors = Object.entries(t4).flatMap(([statId, t4Value]) => {
      const t8Value = t8[statId];
      if (t8Value === undefined || t4Value <= 0 || t8Value <= 0) return [];
      return [Math.pow(t8Value / t4Value, 1 / 4)];
    });
    if (statFactors.length === 0) throw new Error(`No comparable T4/T8 stats for ${family.familyId}`);
    return median(statFactors);
  });
  return median(familyFactors);
}

function roundStat(statId: string, value: number): number {
  return roundEquipmentStatValue(statId as StatId, value);
}

function constrainedTierValues(
  anchorT4: number,
  statId: string,
  tierGrowthFactor: number,
): Readonly<Record<Tier, number>> {
  const values = { 4: roundStat(statId, anchorT4) } as Record<Tier, number>;
  for (const tier of [5, 6, 7, 8] as const) {
    const previousTier = (tier - 1) as Tier;
    const pure = roundStat(statId, anchorT4 * Math.pow(tierGrowthFactor, tier - 4));
    const previousTierThree = roundStat(statId, values[previousTier] * ENCHANTMENT_STAT_MULTIPLIER[3]);
    const floor = previousTierThree + getEquipmentStatRoundingStep(statId as StatId);
    values[tier] = Math.max(pure, floor);
  }
  return values;
}

function snapshotDefinitions(): Map<string, Record<string, number> | undefined> {
  const snapshot = new Map<string, Record<string, number> | undefined>();
  for (const family of EQUIPMENT_FAMILIES) {
    for (const tier of TIERS) {
      const itemId = family.itemIdForTier(tier);
      const definition = ITEM_DEFINITIONS[itemId] as MutableEquipmentDefinition | undefined;
      if (definition === undefined) throw new Error(`Missing equipment definition for ${itemId}`);
      snapshot.set(itemId, definition.stats === undefined ? undefined : { ...definition.stats });
    }
  }
  return snapshot;
}

function applyConstrainedModel(tierGrowthFactor: number): void {
  for (const family of EQUIPMENT_FAMILIES) {
    const anchorStats = statsFor(family.itemIdForTier(4));
    const modeledByTier = new Map<Tier, Record<string, number>>(
      TIERS.map((tier) => [tier, {}]),
    );

    for (const [statId, t4Value] of Object.entries(anchorStats)) {
      const values = constrainedTierValues(t4Value, statId, tierGrowthFactor);
      for (const tier of TIERS) modeledByTier.get(tier)![statId] = values[tier];
    }

    for (const tier of [5, 6, 7, 8] as const) {
      const itemId = family.itemIdForTier(tier);
      const definition = ITEM_DEFINITIONS[itemId] as MutableEquipmentDefinition;
      const preserved = Object.fromEntries(
        Object.entries(definition.stats ?? {}).filter(([statId]) => !MODELED_STATS.has(statId)),
      );
      definition.stats = { ...preserved, ...modeledByTier.get(tier) };
    }
  }
}

function restoreDefinitions(snapshot: ReadonlyMap<string, Record<string, number> | undefined>): void {
  for (const [itemId, stats] of snapshot) {
    const definition = ITEM_DEFINITIONS[itemId] as MutableEquipmentDefinition;
    definition.stats = stats === undefined ? undefined : { ...stats };
  }
}

async function main(): Promise<void> {
  const tierGrowthFactor = deriveTierGrowthFactor();
  const snapshot = snapshotDefinitions();

  console.log("[EQUIPMENT_POWER_CURVE_WORLD_VALIDATION_CONTRACT]", {
    liveMutation: "temporary in-process benchmark mutation only; restored in finally",
    factor: Number(tierGrowthFactor.toFixed(4)),
    formula: "max(round(T4 * G^(tier-4)), round(previousBase * e3) + gameplay rounding quantum)",
    validation: "focused same-tier enchantment audit + focused final-gate audit",
  });

  try {
    applyConstrainedModel(tierGrowthFactor);
    await import("./runtime-enchantment-progression-audit.js");
    await import("./runtime-final-gate-audit.js");
  } finally {
    restoreDefinitions(snapshot);
  }
}

await main();

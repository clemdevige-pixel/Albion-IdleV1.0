import {
  BLACK_MARKET_ARTIFACT_ECONOMIC_VALUE_BY_TIER,
  BLACK_MARKET_RUNE_ECONOMIC_VALUE_BY_TIER,
  DAILY_MERCHANT_UNIT_PRICES,
  DUNGEON_ARTIFACT_FACTIONS,
  getDungeonArtifactItemId,
  getFactionRuneItemId,
  type DailyMerchantTier,
} from "@game/data";
import {
  getNextEnchantmentRecipe,
  scaleEnchantmentRecipe,
  type EnchantmentCostCategory,
} from "../equipment/enchantment-recipes.js";
import type { EnchantmentLevel } from "../inventory/types.js";

export interface EconomicRecipeRequirement {
  readonly itemId: string;
  readonly quantity: number;
}

export interface EconomicEquipmentRecipe {
  readonly outputItemId: string;
  readonly requirements: readonly EconomicRecipeRequirement[];
}

export interface EquipmentEconomicValueInput {
  readonly recipe: EconomicEquipmentRecipe;
  readonly itemTier: DailyMerchantTier;
  readonly enchantment: EnchantmentLevel;
  readonly enchantmentCategory: EnchantmentCostCategory;
}

function isTier(value: number): value is DailyMerchantTier {
  return value === 4 || value === 5 || value === 6 || value === 7 || value === 8;
}

function itemTierFromId(itemId: string): DailyMerchantTier | undefined {
  const match = itemId.match(/_t([4-8])(?:_|$)/);
  const tier = match?.[1] === undefined ? undefined : Number(match[1]);
  return tier !== undefined && isTier(tier) ? tier : undefined;
}

function isArtifactItemId(itemId: string, tier: DailyMerchantTier): boolean {
  return DUNGEON_ARTIFACT_FACTIONS.some(
    (faction) => getDungeonArtifactItemId(faction, tier) === itemId,
  );
}

export function getCanonicalEconomicUnitValue(itemId: string): number | undefined {
  const tier = itemTierFromId(itemId) ?? 4;
  if (!isTier(tier)) return undefined;

  if (itemId.startsWith("item_refined_")) {
    return DAILY_MERCHANT_UNIT_PRICES.refined_resource[tier];
  }
  if (itemId === getFactionRuneItemId(tier)) {
    return BLACK_MARKET_RUNE_ECONOMIC_VALUE_BY_TIER[tier];
  }
  if (itemId === `item_resource_enchantment_shard_t${String(tier)}`) {
    return DAILY_MERCHANT_UNIT_PRICES.enchantment_shard[tier];
  }
  if (isArtifactItemId(itemId, tier)) {
    return BLACK_MARKET_ARTIFACT_ECONOMIC_VALUE_BY_TIER[tier];
  }
  return undefined;
}

function requirementsValue(requirements: readonly EconomicRecipeRequirement[]): number {
  return requirements.reduce((total, requirement) => {
    const unitValue = getCanonicalEconomicUnitValue(requirement.itemId);
    if (unitValue === undefined) {
      throw new Error(`Missing canonical economic value for ${requirement.itemId}`);
    }
    return total + unitValue * requirement.quantity;
  }, 0);
}

export function resolveEquipmentEconomicValue(input: EquipmentEconomicValueInput): number {
  const baseValue = requirementsValue(input.recipe.requirements);
  if (input.enchantment === 0) return baseValue;

  const craftMaterials = input.recipe.requirements.filter((entry) => entry.itemId.startsWith("item_refined_"));
  let total = baseValue;
  for (let fromLevel = 0; fromLevel < input.enchantment; fromLevel += 1) {
    const recipe = getNextEnchantmentRecipe(fromLevel as EnchantmentLevel);
    if (recipe === undefined) break;
    const scaled = scaleEnchantmentRecipe(
      recipe,
      input.itemTier,
      input.enchantmentCategory,
      craftMaterials,
    );
    total += scaled.silverCost + requirementsValue(scaled.materials);
  }
  return total;
}

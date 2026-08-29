import {
  ARTIFACT_ECONOMIC_VALUE_BY_TIER,
  DUNGEON_ARTIFACT_FACTIONS,
  FACTION_RUNE_ECONOMIC_VALUE_BY_TIER,
  PRODUCTION_INPUT_ECONOMIC_VALUE_BY_TIER,
  getDungeonArtifactItemId,
  getFactionRuneItemId,
  type EconomicValueTier,
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
  readonly itemTier: EconomicValueTier;
  readonly enchantment: EnchantmentLevel;
  readonly enchantmentCategory: EnchantmentCostCategory;
}

function isTier(value: number): value is EconomicValueTier {
  return value === 4 || value === 5 || value === 6 || value === 7 || value === 8;
}

function itemTierFromId(itemId: string): EconomicValueTier | undefined {
  const match = itemId.match(/_t([4-8])(?:_|$)/);
  const tier = match?.[1] === undefined ? undefined : Number(match[1]);
  return tier !== undefined && isTier(tier) ? tier : undefined;
}

function isArtifactItemId(itemId: string, tier: EconomicValueTier): boolean {
  return DUNGEON_ARTIFACT_FACTIONS.some(
    (faction) => getDungeonArtifactItemId(faction, tier) === itemId,
  );
}

export function getCanonicalEconomicUnitValue(itemId: string): number | undefined {
  const tier = itemTierFromId(itemId) ?? 4;
  if (!isTier(tier)) return undefined;

  if (itemId.startsWith("item_refined_")) {
    return PRODUCTION_INPUT_ECONOMIC_VALUE_BY_TIER.refined_resource[tier];
  }
  if (itemId === getFactionRuneItemId(tier)) {
    return FACTION_RUNE_ECONOMIC_VALUE_BY_TIER[tier];
  }
  if (itemId === `item_resource_enchantment_shard_t${String(tier)}`) {
    return PRODUCTION_INPUT_ECONOMIC_VALUE_BY_TIER.enchantment_shard[tier];
  }
  if (isArtifactItemId(itemId, tier)) {
    return ARTIFACT_ECONOMIC_VALUE_BY_TIER[tier];
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

  const craftMaterials = input.recipe.requirements.filter((entry) => (
    entry.itemId.startsWith("item_refined_")
    || entry.itemId.startsWith("item_resource_rune_")
  ));
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

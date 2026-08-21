export type {
  EquipmentSlot,
  WeaponHandling,
  EquipmentInfoLike,
  EquipmentInfoResolver,
  EquipOutcome,
  UnequipOutcome,
  EquipmentLoadoutSlot,
  EquipmentLoadout,
  EquipmentLoadoutApplyOutcome,
  EquipmentFailureReason,
  EquipmentResult,
} from "./types.js";
export { EQUIPMENT_SLOTS, equipmentOk, equipmentFail } from "./types.js";
export { EquipmentComponent, type EquipmentData } from "./components.js";
export { EquipmentManager } from "./equipment-manager.js";
export { EquipmentStatSync, type EquipmentStatsChangedHook } from "./equipment-stat-sync.js";
export { getEquipmentStatRoundingStep, roundEquipmentStatValue } from "./equipment-stat-rounding.js";
export { isValidSlot, validateEquipmentState } from "./equipment-validator.js";
export { EquipmentSaveProvider } from "./equipment-save-provider.js";
export {
  ENCHANTMENT_ITEM_POWER,
  ENCHANTMENT_STAT_MULTIPLIER,
  ITEM_POWER_STAT_GAIN_PER_100,
  getBonusItemPowerStatMultiplier,
  getEnchantmentItemPowerBonus,
  getEnchantmentStatMultiplier,
} from "./enchantment-balance.js";
export {
  ENCHANTMENT_RECIPES,
  ENCHANTMENT_MINIMUM_ITEM_TIER,
  ENCHANTMENT_MAXIMUM_ITEM_TIER,
  ENCHANTMENT_RESOURCE_TIERS,
  ENCHANTMENT_SHARD_COSTS,
  ENCHANTMENT_CRAFT_MATERIAL_MULTIPLIERS,
  ENCHANTMENT_CATEGORY_COST_MULTIPLIERS,
  ENCHANTMENT_TIER_COST_MULTIPLIERS,
  getEnchantmentShardItemId,
  getNextEnchantmentRecipe,
  scaleEnchantmentRecipe,
  type ActiveEnchantmentLevel,
  type EnchantmentCostCategory,
  type EnchantmentMaterialCost,
  type EnchantmentRecipe,
} from "./enchantment-recipes.js";
export {
  EnchantmentService,
  type EnchantmentFailureReason,
  type EnchantmentItemInfo,
  type EnchantmentItemInfoResolver,
  type EnchantmentPreview,
  type EnchantmentResult,
  type EnchantmentServiceOptions,
} from "./enchantment-service.js";

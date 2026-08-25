import {
  BLACK_WORLD_ITEM_POWER_PROGRESSION,
  BLUE_WORLD_ITEM_POWER_PROGRESSION,
  ITEM_POWER_BY_TIER,
  ORANGE_WORLD_ITEM_POWER_PROGRESSION,
  RED_WORLD_ITEM_POWER_PROGRESSION,
  WEAPON_CROSS_SPECIALIZATION_IP_PER_LEVEL,
  WEAPON_FAMILY_IP_PER_LEVEL,
  WEAPON_SPECIALIZATION_IP_PER_LEVEL,
  WORLD_ITEM_POWER_PROGRESSION,
  YELLOW_WORLD_ITEM_POWER_PROGRESSION,
  ZONE_RECOMMENDED_ITEM_POWER,
  type WorldBandId,
  type WorldItemPowerProgression,
} from "@game/data";
import { getBonusItemPowerStatMultiplier, getEnchantmentItemPowerBonus, type EnchantmentLevel } from "@game/gameplay";
import {
  getWeaponMasteryFamilyDefinitions,
  resolveWeaponAttackSpeed,
  resolveWeaponCombatProfile,
  resolveWeaponMastery,
  resolveWeaponTier,
  type WeaponCombatProfile,
} from "./weaponContentCatalog.js";
import type { ProductionTier } from "./productionFamilyCatalog.js";

export {
  BLACK_WORLD_ITEM_POWER_PROGRESSION,
  BLUE_WORLD_ITEM_POWER_PROGRESSION,
  ITEM_POWER_BY_TIER,
  ORANGE_WORLD_ITEM_POWER_PROGRESSION,
  RED_WORLD_ITEM_POWER_PROGRESSION,
  WEAPON_CROSS_SPECIALIZATION_IP_PER_LEVEL,
  WEAPON_FAMILY_IP_PER_LEVEL,
  WEAPON_SPECIALIZATION_IP_PER_LEVEL,
  YELLOW_WORLD_ITEM_POWER_PROGRESSION,
  ZONE_RECOMMENDED_ITEM_POWER,
};
export type { WorldItemPowerProgression };

const LEGACY_NON_WEAPON_ITEM_TIERS: Readonly<Record<string, ProductionTier>> = {
  item_leather_armor: 3, item_wooden_shield: 3, item_iron_helmet: 3, item_leather_boots: 3, item_traveler_cape: 3,
};

export interface MasteryLevel { readonly id: string; readonly level: number; }
export interface WeaponMasteryIds { readonly familyId: string; readonly specializationId: string; }

function getWorldItemPowerProgression(worldBandId: WorldBandId): WorldItemPowerProgression {
  return WORLD_ITEM_POWER_PROGRESSION[worldBandId];
}

function parseTierFromItemId(itemId: string): ProductionTier | undefined {
  const match = /(?:^|_)t([3-8])(?:_|$)/.exec(itemId);
  if (match === null) return undefined;
  return Number(match[1]) as ProductionTier;
}

export function getItemTier(itemId: string): ProductionTier | undefined { return resolveWeaponTier(itemId) ?? parseTierFromItemId(itemId) ?? LEGACY_NON_WEAPON_ITEM_TIERS[itemId]; }
export function getItemPower(itemId: string): number | undefined { const tier = getItemTier(itemId); return tier === undefined ? undefined : ITEM_POWER_BY_TIER[tier]; }
export function getWeaponMasteryIds(itemId: string): WeaponMasteryIds | undefined {
  const route = resolveWeaponMastery(itemId);
  return route === undefined ? undefined : { familyId: route.familyId, specializationId: route.weaponId };
}
export function getWeaponCombatProfile(itemId: string): WeaponCombatProfile | undefined { return resolveWeaponCombatProfile(itemId); }
export function getWeaponAttackSpeed(itemId: string): number | undefined { return resolveWeaponAttackSpeed(itemId); }
export function getMasteryItemPowerBonus(itemId: string, masteries: readonly MasteryLevel[]): number {
  const route = getWeaponMasteryIds(itemId); if (route === undefined) return 0;
  const levels = new Map(masteries.map((mastery) => [mastery.id, mastery.level]));
  const family = getWeaponMasteryFamilyDefinitions().find((definition) => definition.masteryId === route.familyId);
  const crossSpecializationLevels = family?.specializationMasteryIds.reduce(
    (sum, specializationId) => specializationId === route.specializationId ? sum : sum + (levels.get(specializationId) ?? 0),
    0,
  ) ?? 0;
  return (levels.get(route.familyId) ?? 0) * WEAPON_FAMILY_IP_PER_LEVEL
    + (levels.get(route.specializationId) ?? 0) * WEAPON_SPECIALIZATION_IP_PER_LEVEL
    + crossSpecializationLevels * WEAPON_CROSS_SPECIALIZATION_IP_PER_LEVEL;
}
export function getEffectiveItemPower(itemId: string, masteries: readonly MasteryLevel[], enchantment: EnchantmentLevel = 0): number | undefined {
  const baseItemPower = getItemPower(itemId);
  return baseItemPower === undefined ? undefined : baseItemPower + getMasteryItemPowerBonus(itemId, masteries) + getEnchantmentItemPowerBonus(enchantment);
}
export function getMasteryDamageMultiplier(itemId: string, masteries: readonly MasteryLevel[]): number { return getBonusItemPowerStatMultiplier(getMasteryItemPowerBonus(itemId, masteries)); }
export function getZoneRecommendedItemPower(zoneIndex: number, worldBandId: WorldBandId = "blue"): number {
  const progression = getWorldItemPowerProgression(worldBandId); const itemPower = progression.zoneStart[zoneIndex - 1];
  if (itemPower === undefined) throw new RangeError(`Missing Item Power target for ${worldBandId} zone ${String(zoneIndex)}`);
  return itemPower;
}
export function getSegmentRecommendedItemPower(zoneIndex: number, segmentIndex: number, worldBandId: WorldBandId = "blue"): number {
  const progression = getWorldItemPowerProgression(worldBandId); const zoneBase = getZoneRecommendedItemPower(zoneIndex, worldBandId); const zoneEnd = progression.zoneEnd[zoneIndex - 1];
  if (zoneEnd === undefined) throw new RangeError(`Missing Item Power end target for ${worldBandId} zone ${String(zoneIndex)}`);
  const progress = Math.max(0, Math.min(9, segmentIndex - 1)) / 9;
  return Math.round(zoneBase + (zoneEnd - zoneBase) * progress);
}

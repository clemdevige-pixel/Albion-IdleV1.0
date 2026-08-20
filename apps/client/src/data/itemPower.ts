import type { WorldBandId } from "@game/data";
import { getBonusItemPowerStatMultiplier, getEnchantmentItemPowerBonus, type EnchantmentLevel } from "@game/gameplay";
import { resolveWeaponAttackSpeed, resolveWeaponCombatProfile, resolveWeaponMastery, resolveWeaponTier, type WeaponCombatProfile } from "./weaponContentCatalog.js";
import type { ProductionTier } from "./productionFamilyCatalog.js";

export const ITEM_POWER_BY_TIER = { 3: 300, 4: 400, 5: 500, 6: 600, 7: 700, 8: 800 } as const;

const LEGACY_NON_WEAPON_ITEM_TIERS: Readonly<Record<string, ProductionTier>> = {
  item_leather_armor: 3, item_wooden_shield: 3, item_iron_helmet: 3, item_leather_boots: 3, item_traveler_cape: 3,
};

export interface MasteryLevel { readonly id: string; readonly level: number; }
export interface WeaponMasteryIds { readonly familyId: string; readonly specializationId: string; }
export interface WorldItemPowerProgression { readonly zoneStart: readonly number[]; readonly zoneEnd: readonly number[]; }

/**
 * Recommended IP is an UX progression marker, not a direct combat-power requirement.
 * Enchantment power is intentionally decoupled from IP; these envelopes are therefore
 * authored from the validated world walls/bridges and the displayed IP at their expected
 * tier/mastery/enchantment checkpoints.
 */
export const BLUE_WORLD_ITEM_POWER_PROGRESSION = { zoneStart: [300, 305, 315, 400, 455], zoneEnd: [305, 315, 400, 455, 510] } as const satisfies WorldItemPowerProgression;
export const YELLOW_WORLD_ITEM_POWER_PROGRESSION = { zoneStart: [510, 535, 560, 585, 610], zoneEnd: [535, 560, 585, 610, 630] } as const satisfies WorldItemPowerProgression;
export const ORANGE_WORLD_ITEM_POWER_PROGRESSION = { zoneStart: [630, 655, 680, 705, 730], zoneEnd: [655, 680, 705, 730, 745] } as const satisfies WorldItemPowerProgression;
export const RED_WORLD_ITEM_POWER_PROGRESSION = { zoneStart: [745, 770, 795, 820, 845], zoneEnd: [770, 795, 820, 845, 860] } as const satisfies WorldItemPowerProgression;
export const BLACK_WORLD_ITEM_POWER_PROGRESSION = { zoneStart: [860, 885, 910, 935, 960], zoneEnd: [885, 910, 935, 960, 975] } as const satisfies WorldItemPowerProgression;

export const ZONE_RECOMMENDED_ITEM_POWER = BLUE_WORLD_ITEM_POWER_PROGRESSION.zoneStart;

const WORLD_ITEM_POWER_PROGRESSION: Partial<Readonly<Record<WorldBandId, WorldItemPowerProgression>>> = {
  blue: BLUE_WORLD_ITEM_POWER_PROGRESSION,
  yellow: YELLOW_WORLD_ITEM_POWER_PROGRESSION,
  orange: ORANGE_WORLD_ITEM_POWER_PROGRESSION,
  red: RED_WORLD_ITEM_POWER_PROGRESSION,
  black: BLACK_WORLD_ITEM_POWER_PROGRESSION,
};

function getWorldItemPowerProgression(worldBandId: WorldBandId): WorldItemPowerProgression {
  const progression = WORLD_ITEM_POWER_PROGRESSION[worldBandId];
  if (progression === undefined) throw new Error(`Item Power progression is not authored for world band: ${worldBandId}`);
  return progression;
}

function parseTierFromItemId(itemId: string): ProductionTier | undefined {
  const match = /(?:^|_)t([3-8])(?:_|$)/.exec(itemId);
  if (match === null) return undefined;
  return Number(match[1]) as ProductionTier;
}

export function getItemTier(itemId: string): ProductionTier | undefined { return resolveWeaponTier(itemId) ?? parseTierFromItemId(itemId) ?? LEGACY_NON_WEAPON_ITEM_TIERS[itemId]; }
export function getItemPower(itemId: string): number | undefined { const tier = getItemTier(itemId); return tier === undefined ? undefined : ITEM_POWER_BY_TIER[tier]; }
export function getWeaponMasteryIds(itemId: string): WeaponMasteryIds | undefined {
  const route = getWeaponMasteryIdsFromContent(itemId);
  return route;
}
function getWeaponMasteryIdsFromContent(itemId: string): WeaponMasteryIds | undefined {
  const route = resolveWeaponMastery(itemId);
  return route === undefined ? undefined : { familyId: route.familyId, specializationId: route.weaponId };
}
export function getWeaponCombatProfile(itemId: string): WeaponCombatProfile | undefined { return resolveWeaponCombatProfile(itemId); }
export function getWeaponAttackSpeed(itemId: string): number | undefined { return resolveWeaponAttackSpeed(itemId); }
export function getMasteryItemPowerBonus(itemId: string, masteries: readonly MasteryLevel[]): number {
  const route = getWeaponMasteryIds(itemId); if (route === undefined) return 0;
  const levels = new Map(masteries.map((mastery) => [mastery.id, mastery.level]));
  return (levels.get(route.familyId) ?? 0) * 0.5 + (levels.get(route.specializationId) ?? 0);
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

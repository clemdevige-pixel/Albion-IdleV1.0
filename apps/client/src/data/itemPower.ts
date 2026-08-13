import type { WorldBandId } from "@game/data";
import {
  getBonusItemPowerStatMultiplier,
  getEnchantmentItemPowerBonus,
  type EnchantmentLevel,
} from "@game/gameplay";
import {
  resolveWeaponAttackSpeed,
  resolveWeaponCombatProfile,
  resolveWeaponMastery,
  resolveWeaponTier,
  type WeaponCombatProfile,
} from "./weaponContentCatalog.js";
import type { ProductionTier } from "./productionFamilyCatalog.js";

/**
 * External Item Power balancing data for the T3→T4 vertical slice.
 * IP is not a combat stat: equipment definitions already contain the fixed
 * bonuses produced by this balance layer.
 */
export const ITEM_POWER_BY_TIER = {
  3: 300,
  4: 400,
  5: 500,
  6: 600,
  7: 700,
  8: 800,
} as const;

/** Legacy non-weapon IDs that predate the tier naming convention. */
const LEGACY_NON_WEAPON_ITEM_TIERS: Readonly<Record<string, ProductionTier>> = {
  item_leather_armor: 3,
  item_wooden_shield: 3,
  item_iron_helmet: 3,
  item_leather_boots: 3,
  item_traveler_cape: 3,
};

export interface MasteryLevel {
  readonly id: string;
  readonly level: number;
}

export interface WeaponMasteryIds {
  readonly familyId: string;
  readonly specializationId: string;
}

/**
 * Recommended IP is a comfort target, not a hard gate. Active abilities,
 * consumables and player decisions allow progression below these values.
 * Future IP-progression systems can progressively close that deliberate gap.
 */
export interface WorldItemPowerProgression {
  readonly zoneStart: readonly number[];
  readonly zoneEnd: readonly number[];
}

export const BLUE_WORLD_ITEM_POWER_PROGRESSION = {
  zoneStart: [220, 300, 360, 430, 510],
  zoneEnd: [300, 360, 430, 510, 600],
} as const satisfies WorldItemPowerProgression;

/**
 * Yellow continues the enchanted-T4 / T5 overlap used by Albion-style IP:
 * T4.1 equals T5.0, T4.2 equals T5.1 and T4.3 equals T5.2.
 * The final 800 IP target is therefore reachable with T5.3 before mastery IP.
 */
export const YELLOW_WORLD_ITEM_POWER_PROGRESSION = {
  zoneStart: [600, 640, 680, 720, 760],
  zoneEnd: [640, 680, 720, 760, 800],
} as const satisfies WorldItemPowerProgression;

/** Backwards-compatible export for the existing Blue-world balance tests. */
export const ZONE_RECOMMENDED_ITEM_POWER =
  BLUE_WORLD_ITEM_POWER_PROGRESSION.zoneStart;

const WORLD_ITEM_POWER_PROGRESSION: Partial<
  Readonly<Record<WorldBandId, WorldItemPowerProgression>>
> = {
  blue: BLUE_WORLD_ITEM_POWER_PROGRESSION,
  yellow: YELLOW_WORLD_ITEM_POWER_PROGRESSION,
};

function getWorldItemPowerProgression(
  worldBandId: WorldBandId,
): WorldItemPowerProgression {
  const progression = WORLD_ITEM_POWER_PROGRESSION[worldBandId];
  if (progression === undefined) {
    throw new Error(`Item Power progression is not authored for world band: ${worldBandId}`);
  }
  return progression;
}

function parseTierFromItemId(itemId: string): ProductionTier | undefined {
  const match = /(?:^|_)t([3-8])(?:_|$)/.exec(itemId);
  if (match === null) return undefined;
  return Number(match[1]) as ProductionTier;
}

export function getItemTier(itemId: string): ProductionTier | undefined {
  return resolveWeaponTier(itemId)
    ?? parseTierFromItemId(itemId)
    ?? LEGACY_NON_WEAPON_ITEM_TIERS[itemId];
}

export function getItemPower(itemId: string): number | undefined {
  const tier = getItemTier(itemId);
  return tier === undefined ? undefined : ITEM_POWER_BY_TIER[tier];
}

export function getWeaponMasteryIds(itemId: string): WeaponMasteryIds | undefined {
  const route = resolveWeaponMastery(itemId);
  return route === undefined
    ? undefined
    : {
        familyId: route.familyId,
        specializationId: route.weaponId,
      };
}

export function getWeaponCombatProfile(itemId: string): WeaponCombatProfile | undefined {
  return resolveWeaponCombatProfile(itemId);
}

export function getWeaponAttackSpeed(itemId: string): number | undefined {
  return resolveWeaponAttackSpeed(itemId);
}

export function getMasteryItemPowerBonus(
  itemId: string,
  masteries: readonly MasteryLevel[],
): number {
  const route = getWeaponMasteryIds(itemId);
  if (route === undefined) return 0;

  const levels = new Map(masteries.map((mastery) => [mastery.id, mastery.level]));
  return (levels.get(route.familyId) ?? 0) * 0.5
    + (levels.get(route.specializationId) ?? 0);
}

export function getEffectiveItemPower(
  itemId: string,
  masteries: readonly MasteryLevel[],
  enchantment: EnchantmentLevel = 0,
): number | undefined {
  const baseItemPower = getItemPower(itemId);
  return baseItemPower === undefined
    ? undefined
    : baseItemPower
      + getMasteryItemPowerBonus(itemId, masteries)
      + getEnchantmentItemPowerBonus(enchantment);
}

/** +100 mastery IP increases the weapon's primary damage by 20%. */
export function getMasteryDamageMultiplier(
  itemId: string,
  masteries: readonly MasteryLevel[],
): number {
  return getBonusItemPowerStatMultiplier(
    getMasteryItemPowerBonus(itemId, masteries),
  );
}

export function getZoneRecommendedItemPower(
  zoneIndex: number,
  worldBandId: WorldBandId = "blue",
): number {
  const progression = getWorldItemPowerProgression(worldBandId);
  const itemPower = progression.zoneStart[zoneIndex - 1];
  if (itemPower === undefined) {
    throw new RangeError(
      `Missing Item Power target for ${worldBandId} zone ${String(zoneIndex)}`,
    );
  }
  return itemPower;
}

export function getSegmentRecommendedItemPower(
  zoneIndex: number,
  segmentIndex: number,
  worldBandId: WorldBandId = "blue",
): number {
  const progression = getWorldItemPowerProgression(worldBandId);
  const zoneBase = getZoneRecommendedItemPower(zoneIndex, worldBandId);
  const zoneEnd = progression.zoneEnd[zoneIndex - 1];
  if (zoneEnd === undefined) {
    throw new RangeError(
      `Missing Item Power end target for ${worldBandId} zone ${String(zoneIndex)}`,
    );
  }
  const progress = Math.max(0, Math.min(9, segmentIndex - 1)) / 9;
  return Math.round(zoneBase + (zoneEnd - zoneBase) * progress);
}

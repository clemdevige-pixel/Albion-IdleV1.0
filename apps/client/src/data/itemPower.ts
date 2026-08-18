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
 * Recommended IP is a comfort/progression target, never a hard gate.
 * It follows the validated Blue progression contract rather than assuming the
 * obsolete +100 IP per enchantment curve.
 */
export interface WorldItemPowerProgression {
  readonly zoneStart: readonly number[];
  readonly zoneEnd: readonly number[];
}

/**
 * Blue contract after the +50 IP/enchantment rebalance:
 * - early T3 remains around the 300 IP baseline;
 * - Dark Swamp is the T4 unlock checkpoint;
 * - the middle of Blue bridges into T4.0/T4.1;
 * - Mountain S10 targets roughly 530 effective IP, reachable by T4.2 plus
 *   natural weapon/family mastery;
 * - T4.3 sits above the requirement and is intended as comfort/AFK headroom.
 */
export const BLUE_WORLD_ITEM_POWER_PROGRESSION = {
  zoneStart: [300, 305, 315, 400, 460],
  zoneEnd: [305, 315, 400, 460, 530],
} as const satisfies WorldItemPowerProgression;

/**
 * Yellow remains independently authored for the later T5 balance pass.
 * Do not infer its combat tuning from the Blue pass.
 */
export const YELLOW_WORLD_ITEM_POWER_PROGRESSION = {
  zoneStart: [600, 640, 680, 720, 760],
  zoneEnd: [640, 680, 720, 760, 800],
} as const satisfies WorldItemPowerProgression;

/**
 * Provisional Orange/T6 recommendation envelope.
 * This exists so every implemented world band is fully consumable by the
 * Dashboard/World UI. Final T6 breakpoints remain authored by the dedicated
 * runtime balance pass once T6 equipment is present; these recommendations
 * must not be treated as the final T6.3 + potion calibration.
 */
export const ORANGE_WORLD_ITEM_POWER_PROGRESSION = {
  zoneStart: [800, 840, 880, 920, 960],
  zoneEnd: [840, 880, 920, 960, 1000],
} as const satisfies WorldItemPowerProgression;

/** Backwards-compatible export for the existing Blue-world balance tests. */
export const ZONE_RECOMMENDED_ITEM_POWER =
  BLUE_WORLD_ITEM_POWER_PROGRESSION.zoneStart;

const WORLD_ITEM_POWER_PROGRESSION: Partial<
  Readonly<Record<WorldBandId, WorldItemPowerProgression>>
> = {
  blue: BLUE_WORLD_ITEM_POWER_PROGRESSION,
  yellow: YELLOW_WORLD_ITEM_POWER_PROGRESSION,
  orange: ORANGE_WORLD_ITEM_POWER_PROGRESSION,
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

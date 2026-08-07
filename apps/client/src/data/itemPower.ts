/**
 * External Item Power balancing data for the T3→T4 vertical slice.
 * IP is not a combat stat: equipment definitions already contain the fixed
 * bonuses produced by this balance layer.
 */
export const ITEM_POWER_BY_TIER = {
  3: 300,
  4: 400,
} as const;

const ITEM_TIERS: Readonly<Record<string, 3 | 4>> = {
  item_weapon_sword_t3_broadsword: 3,
  item_weapon_bow_t3_longbow: 3,
  item_weapon_staff_t3_fire: 3,
  item_weapon_gloves_t3_spiked_gauntlets: 3,
  item_leather_armor: 3,
  item_wooden_shield: 3,
  item_shield_t3_reinforced: 3,
  item_shield_t4_reinforced: 4,
  item_iron_helmet: 3,
  item_leather_boots: 3,
  item_traveler_cape: 3,
  item_weapon_sword_t4_broadsword: 4,
  item_weapon_bow_t4_longbow: 4,
  item_weapon_bow_t4_badon: 4,
  item_weapon_staff_t4_fire: 4,
  item_weapon_gloves_t4_spiked_gauntlets: 4,
  item_helmet_t4_reinforced: 4,
  item_armor_t4_leather: 4,
  item_boots_t4_leather: 4,
};

export interface MasteryLevel {
  readonly id: string;
  readonly level: number;
}

export interface WeaponMasteryIds {
  readonly familyId: string;
  readonly specializationId: string;
}

const WEAPON_MASTERY_BY_ITEM: Readonly<Record<string, WeaponMasteryIds>> = {
  item_weapon_sword_t3_broadsword: { familyId: "mastery_sword", specializationId: "mastery_broadsword" },
  item_weapon_sword_t4_broadsword: { familyId: "mastery_sword", specializationId: "mastery_broadsword" },
  item_weapon_bow_t3_longbow: { familyId: "mastery_bow", specializationId: "mastery_longbow" },
  item_weapon_bow_t4_longbow: { familyId: "mastery_bow", specializationId: "mastery_longbow" },
  item_weapon_bow_t4_badon: { familyId: "mastery_bow", specializationId: "mastery_badon" },
  item_weapon_staff_t3_fire: { familyId: "mastery_fire_staff", specializationId: "mastery_t4_fire_staff" },
  item_weapon_staff_t4_fire: { familyId: "mastery_fire_staff", specializationId: "mastery_t4_fire_staff" },
  item_weapon_gloves_t3_spiked_gauntlets: { familyId: "mastery_gloves", specializationId: "mastery_spiked_gauntlets" },
  item_weapon_gloves_t4_spiked_gauntlets: { familyId: "mastery_gloves", specializationId: "mastery_spiked_gauntlets" },
};

export type WeaponCombatProfile = "dagger" | "sword" | "bow" | "staff" | "hammer" | "gloves";

/**
 * Attacks per second are an identity property of the weapon profile.
 * Tier, Item Power and masteries must never alter these values.
 */
export const WEAPON_ATTACK_SPEED_BY_PROFILE: Readonly<Record<WeaponCombatProfile, number>> = {
  dagger: 1.6,
  sword: 1.2,
  bow: 1,
  staff: 0.9,
  hammer: 0.75,
  gloves: 1.4,
};

const WEAPON_PROFILE_BY_ITEM: Readonly<Record<string, WeaponCombatProfile>> = {
  item_weapon_sword_t3_broadsword: "sword",
  item_weapon_sword_t4_broadsword: "sword",
  item_weapon_bow_t3_longbow: "bow",
  item_weapon_bow_t4_longbow: "bow",
  item_weapon_bow_t4_badon: "bow",
  item_weapon_staff_t3_fire: "staff",
  item_weapon_staff_t4_fire: "staff",
  item_weapon_gloves_t3_spiked_gauntlets: "gloves",
  item_weapon_gloves_t4_spiked_gauntlets: "gloves",
};

/**
 * Recommended IP is a comfort target, not a hard gate. Active abilities,
 * consumables and player decisions allow progression below these values.
 * Future IP-progression systems can progressively close that deliberate gap.
 */
export const ZONE_RECOMMENDED_ITEM_POWER = [220, 300, 360, 430, 510] as const;
const ZONE_END_RECOMMENDED_ITEM_POWER = [300, 360, 430, 510, 600] as const;

export function getItemTier(itemId: string): 3 | 4 | undefined {
  return ITEM_TIERS[itemId];
}

export function getItemPower(itemId: string): number | undefined {
  const tier = getItemTier(itemId);
  return tier === undefined ? undefined : ITEM_POWER_BY_TIER[tier];
}

export function getWeaponMasteryIds(itemId: string): WeaponMasteryIds | undefined {
  return WEAPON_MASTERY_BY_ITEM[itemId];
}

export function getWeaponCombatProfile(itemId: string): WeaponCombatProfile | undefined {
  return WEAPON_PROFILE_BY_ITEM[itemId];
}

export function getWeaponAttackSpeed(itemId: string): number | undefined {
  const profile = getWeaponCombatProfile(itemId);
  return profile === undefined ? undefined : WEAPON_ATTACK_SPEED_BY_PROFILE[profile];
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

export function getZoneRecommendedItemPower(zoneIndex: number): number {
  return ZONE_RECOMMENDED_ITEM_POWER[zoneIndex - 1] ?? 400;
}

export function getSegmentRecommendedItemPower(
  zoneIndex: number,
  segmentIndex: number,
): number {
  const zoneBase = getZoneRecommendedItemPower(zoneIndex);
  const zoneEnd =
    ZONE_END_RECOMMENDED_ITEM_POWER[zoneIndex - 1]
    ?? ZONE_END_RECOMMENDED_ITEM_POWER[ZONE_END_RECOMMENDED_ITEM_POWER.length - 1]
    ?? zoneBase;
  const progress = Math.max(0, Math.min(9, segmentIndex - 1)) / 9;
  return Math.round(zoneBase + (zoneEnd - zoneBase) * progress);
}
import {
  getBonusItemPowerStatMultiplier,
  getEnchantmentItemPowerBonus,
  type EnchantmentLevel,
} from "@game/gameplay";

import type { EnchantmentLevel } from "@game/gameplay";
import { FACTION_CAPE_CONTENT } from "./factionCapeContentCatalog.js";
import { resolveEnchantmentItemInfo as resolveLegacyEnchantmentItemInfo } from "./itemContentCatalog.js";
import { WEAPON_ITEM_DEFINITIONS, resolveWeaponTier } from "./weaponContentCatalog.js";

interface EnchantmentPolicy { readonly enabled: boolean; readonly maximumLevel: EnchantmentLevel; }

const WEAPON_ENCHANTMENT_POLICY: Readonly<Record<string, EnchantmentPolicy>> = Object.fromEntries(
  Object.keys(WEAPON_ITEM_DEFINITIONS).flatMap((itemId) => {
    const tier = resolveWeaponTier(itemId);
    return tier !== undefined && tier >= 4
      ? [[itemId, { enabled: true, maximumLevel: 4 as const }] as const]
      : [];
  }),
);

const FACTION_CAPE_ENCHANTMENT_POLICY: Readonly<Record<string, EnchantmentPolicy>> = Object.fromEntries(
  FACTION_CAPE_CONTENT.map((cape) => [cape.itemId, { enabled: true, maximumLevel: 3 as const }]),
);

/**
 * Explicit authored eligibility by equipment category.
 *
 * Weapon eligibility is derived from the authoritative weapon catalog: every
 * authored T4-T8 weapon can reach .4 (Awakened). Conventional armor, off-hand
 * and faction capes remain capped at .3.
 */
export const ENCHANTMENT_ITEM_POLICY: Readonly<Record<string, EnchantmentPolicy>> = {
  ...WEAPON_ENCHANTMENT_POLICY,

  item_shield_t4_reinforced: { enabled: true, maximumLevel: 3 },
  item_shield_t5_reinforced: { enabled: true, maximumLevel: 3 },
  item_shield_t6_reinforced: { enabled: true, maximumLevel: 3 },
  item_shield_t7_reinforced: { enabled: true, maximumLevel: 3 },
  item_shield_t8_reinforced: { enabled: true, maximumLevel: 3 },

  item_helmet_t4_reinforced: { enabled: true, maximumLevel: 3 },
  item_helmet_t5_reinforced: { enabled: true, maximumLevel: 3 },
  item_helmet_t6_reinforced: { enabled: true, maximumLevel: 3 },
  item_helmet_t7_reinforced: { enabled: true, maximumLevel: 3 },
  item_helmet_t8_reinforced: { enabled: true, maximumLevel: 3 },

  item_armor_t4_leather: { enabled: true, maximumLevel: 3 },
  item_armor_t5_leather: { enabled: true, maximumLevel: 3 },
  item_armor_t6_leather: { enabled: true, maximumLevel: 3 },
  item_armor_t7_leather: { enabled: true, maximumLevel: 3 },
  item_armor_t8_leather: { enabled: true, maximumLevel: 3 },

  item_boots_t4_leather: { enabled: true, maximumLevel: 3 },
  item_boots_t5_leather: { enabled: true, maximumLevel: 3 },
  item_boots_t6_leather: { enabled: true, maximumLevel: 3 },
  item_boots_t7_leather: { enabled: true, maximumLevel: 3 },
  item_boots_t8_leather: { enabled: true, maximumLevel: 3 },

  ...FACTION_CAPE_ENCHANTMENT_POLICY,
};

/** Single authored gate for whether an item may participate in .4 Awakening. */
export function isAwakeningEligibleWeapon(itemId: string): boolean {
  const policy = ENCHANTMENT_ITEM_POLICY[itemId];
  return policy?.enabled === true && policy.maximumLevel === 4;
}

export function resolveAuthoredEnchantmentItemInfo(itemId: string) {
  const base = resolveLegacyEnchantmentItemInfo(itemId);
  if (base === undefined) return undefined;
  const policy = ENCHANTMENT_ITEM_POLICY[itemId];
  return {
    ...base,
    enchantable: policy?.enabled ?? false,
    maximumLevel: policy?.maximumLevel ?? 0,
  };
}

import type { EnchantmentLevel } from "@game/gameplay";
import { resolveEnchantmentItemInfo as resolveLegacyEnchantmentItemInfo } from "./itemContentCatalog.js";

interface EnchantmentPolicy { readonly enabled: boolean; readonly maximumLevel: EnchantmentLevel; }

/**
 * Explicit authored eligibility. Weapons can reach .4 (Awakened); conventional
 * armor/off-hand equipment remains capped at .3.
 */
export const ENCHANTMENT_ITEM_POLICY: Readonly<Record<string, EnchantmentPolicy>> = {
  item_weapon_sword_t4_broadsword: { enabled: true, maximumLevel: 4 },
  item_weapon_sword_t5_broadsword: { enabled: true, maximumLevel: 4 },
  item_weapon_sword_t6_broadsword: { enabled: true, maximumLevel: 4 },
  item_weapon_sword_t7_broadsword: { enabled: true, maximumLevel: 4 },
  item_weapon_sword_t8_broadsword: { enabled: true, maximumLevel: 4 },

  item_weapon_bow_t4_longbow: { enabled: true, maximumLevel: 4 },
  item_weapon_bow_t5_longbow: { enabled: true, maximumLevel: 4 },
  item_weapon_bow_t6_longbow: { enabled: true, maximumLevel: 4 },
  item_weapon_bow_t7_longbow: { enabled: true, maximumLevel: 4 },
  item_weapon_bow_t8_longbow: { enabled: true, maximumLevel: 4 },
  item_weapon_bow_t4_badon: { enabled: true, maximumLevel: 4 },

  item_weapon_staff_t4_infernal: { enabled: true, maximumLevel: 4 },
  item_weapon_staff_t5_infernal: { enabled: true, maximumLevel: 4 },
  item_weapon_staff_t6_infernal: { enabled: true, maximumLevel: 4 },
  item_weapon_staff_t7_infernal: { enabled: true, maximumLevel: 4 },
  item_weapon_staff_t8_infernal: { enabled: true, maximumLevel: 4 },

  item_weapon_gloves_t4_spiked_gauntlets: { enabled: true, maximumLevel: 4 },
  item_weapon_gloves_t5_spiked_gauntlets: { enabled: true, maximumLevel: 4 },
  item_weapon_gloves_t6_spiked_gauntlets: { enabled: true, maximumLevel: 4 },
  item_weapon_gloves_t7_spiked_gauntlets: { enabled: true, maximumLevel: 4 },
  item_weapon_gloves_t8_spiked_gauntlets: { enabled: true, maximumLevel: 4 },

  item_weapon_dagger_t4_pair: { enabled: true, maximumLevel: 4 },
  item_weapon_dagger_t5_pair: { enabled: true, maximumLevel: 4 },
  item_weapon_dagger_t6_pair: { enabled: true, maximumLevel: 4 },
  item_weapon_dagger_t7_pair: { enabled: true, maximumLevel: 4 },
  item_weapon_dagger_t8_pair: { enabled: true, maximumLevel: 4 },

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

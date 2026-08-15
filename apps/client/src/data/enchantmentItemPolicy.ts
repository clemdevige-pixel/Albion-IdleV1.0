import type { EnchantmentLevel } from "@game/gameplay";
import { resolveEnchantmentItemInfo as resolveLegacyEnchantmentItemInfo } from "./itemContentCatalog.js";

interface EnchantmentPolicy { readonly enabled: boolean; readonly maximumLevel: EnchantmentLevel; }

/** Explicit authored eligibility. Adding an equipment item does not implicitly make it enchantable. */
export const ENCHANTMENT_ITEM_POLICY: Readonly<Record<string, EnchantmentPolicy>> = {
  item_weapon_sword_t4_broadsword: { enabled: true, maximumLevel: 3 },
  item_weapon_sword_t5_broadsword: { enabled: true, maximumLevel: 3 },
  item_weapon_bow_t4_longbow: { enabled: true, maximumLevel: 3 },
  item_weapon_bow_t5_longbow: { enabled: true, maximumLevel: 3 },
  item_weapon_bow_t4_badon: { enabled: true, maximumLevel: 3 },
  item_weapon_staff_t4_infernal: { enabled: true, maximumLevel: 3 },
  item_weapon_staff_t5_infernal: { enabled: true, maximumLevel: 3 },
  item_weapon_gloves_t4_spiked_gauntlets: { enabled: true, maximumLevel: 3 },
  item_weapon_gloves_t5_spiked_gauntlets: { enabled: true, maximumLevel: 3 },
  item_weapon_dagger_t4_pair: { enabled: true, maximumLevel: 3 },
  item_weapon_dagger_t5_pair: { enabled: true, maximumLevel: 3 },
  item_shield_t4_reinforced: { enabled: true, maximumLevel: 3 },
  item_shield_t5_reinforced: { enabled: true, maximumLevel: 3 },
  item_helmet_t4_reinforced: { enabled: true, maximumLevel: 3 },
  item_helmet_t5_reinforced: { enabled: true, maximumLevel: 3 },
  item_armor_t4_leather: { enabled: true, maximumLevel: 3 },
  item_armor_t5_leather: { enabled: true, maximumLevel: 3 },
  item_boots_t4_leather: { enabled: true, maximumLevel: 3 },
  item_boots_t5_leather: { enabled: true, maximumLevel: 3 },
};

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

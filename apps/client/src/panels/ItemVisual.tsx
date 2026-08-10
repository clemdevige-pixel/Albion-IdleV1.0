import {
  WEAPON_ITEM_DEFINITIONS,
  getWeaponMasteryDisplayName,
  resolveWeaponMastery,
  resolveWeaponTier,
} from "../data/weaponContentCatalog";
import { resolveEquipmentPresentation } from "../data/equipmentPresentation";

export interface ItemVisualDefinition {
  readonly name: string;
  readonly icon: string;
  readonly tier: number;
  readonly slot: "head" | "chest" | "boots" | "weapon" | "off_hand" | "cape";
  readonly handling?: "one_handed" | "two_handed";
  readonly stats: Readonly<Record<string, number>>;
}

interface ConsumableVisualDefinition {
  readonly name: string;
  readonly icon: string;
}

const NON_WEAPON_ITEM_VISUALS: Readonly<Record<string, ItemVisualDefinition>> = {
  item_leather_armor: { name: "Armure de cuir", icon: "item-leather-armor-pixel-v1.png", tier: 3, slot: "chest", stats: { stat_armor: 8, stat_max_health: 50 } },
  item_wooden_shield: { name: "Bouclier en bois", icon: "item-wooden-shield-pixel-v1.png", tier: 3, slot: "off_hand", stats: { stat_armor: 5, stat_magic_resistance: 3 } },
  item_shield_t3_reinforced: { name: "Bouclier renforcé T3", icon: "item-wooden-shield-pixel-v1.png", tier: 3, slot: "off_hand", stats: { stat_armor: 9, stat_magic_resistance: 5 } },
  item_shield_t4_reinforced: { name: "Bouclier renforcé T4", icon: "item-wooden-shield-pixel-v1.png", tier: 4, slot: "off_hand", stats: { stat_armor: 15, stat_magic_resistance: 9 } },
  item_iron_helmet: { name: "Casque en fer", icon: "item-iron-helmet-pixel-v1.png", tier: 3, slot: "head", stats: { stat_armor: 4, stat_max_health: 30 } },
  item_leather_boots: { name: "Bottes de cuir", icon: "item-leather-boots-pixel-v1.png", tier: 3, slot: "boots", stats: { stat_armor: 3 } },
  item_traveler_cape: { name: "Cape du voyageur", icon: "item-traveler-cape-pixel-v1.png", tier: 3, slot: "cape", stats: { stat_magic_resistance: 4 } },
  item_helmet_t4_reinforced: { name: "Casque renforcé T4", icon: "item-iron-helmet-pixel-v1.png", tier: 4, slot: "head", stats: { stat_armor: 8, stat_max_health: 55 } },
  item_armor_t4_leather: { name: "Armure de cuir T4", icon: "item-leather-armor-pixel-v1.png", tier: 4, slot: "chest", stats: { stat_armor: 14, stat_max_health: 90 } },
  item_boots_t4_leather: { name: "Bottes de cuir T4", icon: "item-leather-boots-pixel-v1.png", tier: 4, slot: "boots", stats: { stat_armor: 6 } },
};

const CONSUMABLE_VISUALS: Readonly<Record<string, ConsumableVisualDefinition>> = {
  item_health_potion: { name: "Potion de soin", icon: "item-health-potion-pixel-v1.png" },
  item_energy_potion: { name: "Potion d'énergie", icon: "item-energy-potion-pixel-v1.png" },
};

const RESOURCE_VISUALS: Readonly<Record<string, { readonly name: string; readonly icon: string }>> = {
  item_resource_wood_t3: { name: "Bois de bouleau", icon: "resource-birch-log.png" },
  item_refined_planks_t3: { name: "Planches de bouleau", icon: "resource-birch-planks.png" },
  item_resource_copper_ore_t3: { name: "Minerai de cuivre", icon: "resource-copper-ore.png" },
  item_refined_copper_bar_t3: { name: "Lingot de cuivre", icon: "resource-copper-ingot.png" },
};

const ENCHANTMENT_RESOURCE_VISUALS: Readonly<Record<string, { readonly name: string; readonly symbol: string }>> = {
  item_resource_enchantment_essence: { name: "Essence d’enchantement", symbol: "✦" },
  item_resource_arcane_crystal: { name: "Cristal arcanique", symbol: "◆" },
  item_resource_enchantment_catalyst: { name: "Catalyseur d’enchantement", symbol: "⬢" },
};

function getWeaponItemDefinition(itemId: string): ItemVisualDefinition | undefined {
  const equipment = WEAPON_ITEM_DEFINITIONS[itemId];
  const tier = resolveWeaponTier(itemId);
  const mastery = resolveWeaponMastery(itemId);
  const presentation = resolveEquipmentPresentation(itemId);
  if (equipment === undefined || tier === undefined || mastery === undefined || presentation === undefined) return undefined;

  const specializationName = getWeaponMasteryDisplayName(mastery.weaponId);
  if (specializationName === undefined) return undefined;

  return {
    name: `${specializationName} T${String(tier)}`,
    icon: presentation.itemIcon,
    tier,
    slot: "weapon",
    handling: equipment.handling,
    stats: equipment.stats,
  };
}

export function getItemDefinition(itemId: string): ItemVisualDefinition | undefined {
  return getWeaponItemDefinition(itemId) ?? NON_WEAPON_ITEM_VISUALS[itemId];
}

export function getItemDisplayName(itemId: string): string {
  return getItemDefinition(itemId)?.name
    ?? CONSUMABLE_VISUALS[itemId]?.name
    ?? RESOURCE_VISUALS[itemId]?.name
    ?? ENCHANTMENT_RESOURCE_VISUALS[itemId]?.name
    ?? itemId.replace("item_", "").replace(/_/g, " ");
}

export function getEnchantmentFrameClass(enchantment: number | undefined): string {
  if (enchantment === 1 || enchantment === 2 || enchantment === 3) {
    return ` enchantment-frame--${String(enchantment)}`;
  }
  return "";
}

export function ItemVisual({ itemId }: { readonly itemId: string }): JSX.Element {
  const visual = getItemDefinition(itemId) ?? CONSUMABLE_VISUALS[itemId];
  const resource = RESOURCE_VISUALS[itemId];
  const enchantmentResource = ENCHANTMENT_RESOURCE_VISUALS[itemId];
  if (enchantmentResource !== undefined) {
    return <span className="item-visual__fallback item-visual__fallback--enchantment" aria-label={enchantmentResource.name}>{enchantmentResource.symbol}</span>;
  }
  if (resource !== undefined) {
    return <img className="item-visual__image item-visual__image--resource" src={`/assets/resources/${resource.icon}`} alt={resource.name} draggable={false} />;
  }
  if (visual === undefined) {
    return <span className="item-visual__fallback">{itemId.slice(0, 2).toUpperCase()}</span>;
  }
  return <img className="item-visual__image" src={`/assets/items/${visual.icon}`} alt={visual.name} draggable={false} />;
}

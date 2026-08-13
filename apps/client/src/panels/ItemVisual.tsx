import {
  WEAPON_ITEM_DEFINITIONS,
  getWeaponMasteryDisplayName,
  resolveWeaponMastery,
  resolveWeaponTier,
} from "../data/weaponContentCatalog";
import { resolveEquipmentPresentation } from "../data/equipmentPresentation";
import { resolveEquipmentInfo } from "../data/itemContentCatalog";

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

interface SymbolVisualDefinition {
  readonly name: string;
  readonly symbol: string;
  readonly className: string;
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
  item_shield_t5_reinforced: { name: "Bouclier renforcé T5", icon: "item-wooden-shield-pixel-v1.png", tier: 5, slot: "off_hand", stats: { stat_armor: 22, stat_magic_resistance: 13 } },
  item_helmet_t5_reinforced: { name: "Casque renforcé T5", icon: "item-iron-helmet-pixel-v1.png", tier: 5, slot: "head", stats: { stat_armor: 12, stat_magic_resistance: 9, stat_max_health: 85 } },
  item_armor_t5_leather: { name: "Armure de cuir T5", icon: "item-leather-armor-pixel-v1.png", tier: 5, slot: "chest", stats: { stat_armor: 21, stat_magic_resistance: 15, stat_max_health: 135 } },
  item_boots_t5_leather: { name: "Bottes de cuir T5", icon: "item-leather-boots-pixel-v1.png", tier: 5, slot: "boots", stats: { stat_armor: 9, stat_magic_resistance: 6 } },
};

const CONSUMABLE_VISUALS: Readonly<Record<string, ConsumableVisualDefinition>> = {
  item_health_potion: { name: "Potion de soin", icon: "item-health-potion-pixel-v1.png" },
};

const RESOURCE_VISUALS: Readonly<Record<string, { readonly name: string; readonly icon: string }>> = {
  item_resource_wood_t3: { name: "Bois de bouleau", icon: "resource-birch-log.png" },
  item_refined_planks_t3: { name: "Planches de bouleau", icon: "resource-birch-planks.png" },
  item_resource_copper_ore_t3: { name: "Minerai de cuivre", icon: "resource-copper-ore.png" },
  item_refined_copper_bar_t3: { name: "Lingot de cuivre", icon: "resource-copper-ingot.png" },
  item_resource_wood_t4: { name: "Bois de pin", icon: "resource-birch-log.png" },
  item_refined_planks_t4: { name: "Planches de pin", icon: "resource-birch-planks.png" },
  item_resource_ore_t4: { name: "Minerai de fer", icon: "resource-copper-ore.png" },
  item_refined_metal_bar_t4: { name: "Lingot de fer", icon: "resource-copper-ingot.png" },
  item_resource_hide_t3: { name: "Peau robuste", icon: "resource-hide.png" },
  item_refined_leather_t3: { name: "Cuir robuste", icon: "resource-leather.png" },
  item_resource_hide_t4: { name: "Peau épaisse", icon: "resource-hide.png" },
  item_refined_leather_t4: { name: "Cuir épais", icon: "resource-leather.png" },
  item_resource_fiber_t3: { name: "Fibres de lin", icon: "resource-fiber.png" },
  item_refined_cloth_t3: { name: "Tissu de lin", icon: "resource-cloth.png" },
  item_resource_fiber_t4: { name: "Fibres de coton", icon: "resource-fiber.png" },
  item_refined_cloth_t4: { name: "Tissu fin", icon: "resource-cloth.png" },
  item_resource_wood_t5: { name: "Bois de cèdre", icon: "resource-birch-log.png" },
  item_refined_planks_t5: { name: "Planches de cèdre", icon: "resource-birch-planks.png" },
  item_resource_ore_t5: { name: "Minerai de titane", icon: "resource-copper-ore.png" },
  item_refined_metal_bar_t5: { name: "Lingot de titane", icon: "resource-copper-ingot.png" },
  item_resource_hide_t5: { name: "Peau lourde", icon: "resource-hide.png" },
  item_refined_leather_t5: { name: "Cuir lourd", icon: "resource-leather.png" },
  item_resource_fiber_t5: { name: "Fibre céleste", icon: "resource-fiber.png" },
  item_refined_cloth_t5: { name: "Tissu orné", icon: "resource-cloth.png" },
};

const ENCHANTMENT_RESOURCE_VISUALS: Readonly<Record<string, { readonly name: string; readonly symbol: string }>> = {
  item_resource_enchantment_essence: { name: "Essence d’enchantement", symbol: "✦" },
  item_resource_arcane_crystal: { name: "Cristal arcanique", symbol: "◆" },
  item_resource_enchantment_catalyst: { name: "Catalyseur d’enchantement", symbol: "⬢" },
};

const FACTION_DISPLAY_NAMES: Readonly<Record<string, string>> = {
  animal: "Animal",
  generic: "Générique",
  heretic: "Hérétique",
  keeper: "Keeper",
  morgana: "Morgana",
  undead: "Mort-vivant",
};

function formatFactionName(factionId: string): string {
  return FACTION_DISPLAY_NAMES[factionId]
    ?? factionId
      .split("_")
      .filter((part) => part.length > 0)
      .map((part) => `${part.charAt(0).toUpperCase()}${part.slice(1)}`)
      .join(" ");
}

function getBlueZoneSpecialLootVisual(itemId: string): SymbolVisualDefinition | undefined {
  const definitions = [
    { prefix: "item_resource_artifact_fragment_", label: "Fragment d’artefact", symbol: "◈", className: "artifact-fragment" },
    { prefix: "item_resource_artifact_", label: "Artefact", symbol: "✺", className: "artifact" },
    { prefix: "item_resource_dungeon_key_", label: "Clé de donjon", symbol: "⚿", className: "dungeon-key" },
    { prefix: "item_resource_key_fragment_", label: "Fragment de clé", symbol: "⌁", className: "key-fragment" },
  ] as const;

  for (const definition of definitions) {
    if (!itemId.startsWith(definition.prefix)) continue;
    const factionId = itemId.slice(definition.prefix.length);
    if (factionId.length === 0) return undefined;
    return {
      name: `${definition.label} · ${formatFactionName(factionId)}`,
      symbol: definition.symbol,
      className: definition.className,
    };
  }

  return undefined;
}

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
    ...(equipment.handling === "one_handed" || equipment.handling === "two_handed" ? { handling: equipment.handling } : {}),
    stats: equipment.stats ?? {},
  };
}

export function getItemDefinition(itemId: string): ItemVisualDefinition | undefined {
  const visual = getWeaponItemDefinition(itemId) ?? NON_WEAPON_ITEM_VISUALS[itemId];
  if (visual === undefined) return undefined;

  const equipment = resolveEquipmentInfo(itemId);
  if (equipment === undefined) return visual;

  return {
    ...visual,
    stats: equipment.stats ?? {},
  };
}

export function getItemDisplayName(itemId: string): string {
  return getItemDefinition(itemId)?.name
    ?? CONSUMABLE_VISUALS[itemId]?.name
    ?? RESOURCE_VISUALS[itemId]?.name
    ?? ENCHANTMENT_RESOURCE_VISUALS[itemId]?.name
    ?? getBlueZoneSpecialLootVisual(itemId)?.name
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
  const specialLoot = getBlueZoneSpecialLootVisual(itemId);
  if (enchantmentResource !== undefined) {
    return <span className="item-visual__fallback item-visual__fallback--enchantment" aria-label={enchantmentResource.name}>{enchantmentResource.symbol}</span>;
  }
  if (specialLoot !== undefined) {
    return <span className={`item-visual__fallback item-visual__fallback--${specialLoot.className}`} aria-label={specialLoot.name}>{specialLoot.symbol}</span>;
  }
  if (resource !== undefined) {
    return <img className="item-visual__image item-visual__image--resource" src={`/assets/resources/${resource.icon}`} alt={resource.name} draggable={false} />;
  }
  if (visual === undefined) {
    return <span className="item-visual__fallback">{itemId.slice(0, 2).toUpperCase()}</span>;
  }
  return <img className="item-visual__image" src={`/assets/items/${visual.icon}`} alt={visual.name} draggable={false} />;
}

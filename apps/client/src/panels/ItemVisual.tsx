import {
  WEAPON_ITEM_DEFINITIONS,
  getWeaponMasteryDisplayName,
  resolveWeaponMastery,
  resolveWeaponTier,
} from "../data/weaponContentCatalog";
import { resolveEquipmentPresentation } from "../data/equipmentPresentation";
import { resolveEquipmentInfo } from "../data/itemContentCatalog";
import {
  PRODUCTION_RESOURCE_VISUALS,
  PROGRESSION_NON_WEAPON_VISUALS,
  type CatalogItemVisualDefinition,
} from "../data/itemVisualContentCatalog";
import "./itemRarity.css";

export type ItemVisualDefinition = CatalogItemVisualDefinition;
interface ConsumableVisualDefinition { readonly name: string; readonly icon: string; }
interface SymbolVisualDefinition { readonly name: string; readonly symbol: string; readonly className: string; }

/** Non-progression equipment that intentionally sits outside the tier families. */
const LEGACY_NON_WEAPON_ITEM_VISUALS: Readonly<Record<string, ItemVisualDefinition>> = {
  item_wooden_shield: {
    name: "Bouclier en bois",
    icon: "item-wooden-shield-pixel-v1.png",
    tier: 3,
    slot: "off_hand",
    stats: { stat_armor: 5, stat_magic_resistance: 3 },
  },
  item_traveler_cape: {
    name: "Cape du voyageur",
    icon: "item-traveler-cape-pixel-v1.png",
    tier: 3,
    slot: "cape",
    stats: { stat_magic_resistance: 4 },
  },
};

const NON_WEAPON_ITEM_VISUALS: Readonly<Record<string, ItemVisualDefinition>> = {
  ...PROGRESSION_NON_WEAPON_VISUALS,
  ...LEGACY_NON_WEAPON_ITEM_VISUALS,
};

const CONSUMABLE_VISUALS: Readonly<Record<string, ConsumableVisualDefinition>> = {
  item_health_potion: { name: "Potion de soin", icon: "item-health-potion-pixel-v1.png" },
};

const ENCHANTMENT_RESOURCE_VISUALS: Readonly<Record<string, { readonly name: string; readonly symbol: string }>> = {
  item_resource_enchantment_shard_t4: { name: "Éclat d’enchantement T4", symbol: "✦" },
  item_resource_enchantment_shard_t5: { name: "Éclat d’enchantement T5", symbol: "✦" },
  item_resource_enchantment_shard_t6: { name: "Éclat d’enchantement T6", symbol: "✦" },
  item_resource_enchantment_shard_t7: { name: "Éclat d’enchantement T7", symbol: "✦" },
  item_resource_enchantment_shard_t8: { name: "Éclat d’enchantement T8", symbol: "✦" },
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
  return FACTION_DISPLAY_NAMES[factionId] ?? factionId
    .split("_")
    .filter((part) => part.length > 0)
    .map((part) => `${part.charAt(0).toUpperCase()}${part.slice(1)}`)
    .join(" ");
}

function getCombatSpecialLootVisual(itemId: string): SymbolVisualDefinition | undefined {
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
  if (
    equipment === undefined
    || tier === undefined
    || mastery === undefined
    || presentation === undefined
  ) {
    return undefined;
  }
  const specializationName = getWeaponMasteryDisplayName(mastery.weaponId);
  if (specializationName === undefined) return undefined;
  return {
    name: `${specializationName} T${String(tier)}`,
    icon: presentation.itemIcon,
    tier,
    slot: "weapon",
    ...(equipment.handling === "one_handed" || equipment.handling === "two_handed"
      ? { handling: equipment.handling }
      : {}),
    stats: equipment.stats ?? {},
  };
}

export function getItemDefinition(itemId: string): ItemVisualDefinition | undefined {
  const visual = getWeaponItemDefinition(itemId) ?? NON_WEAPON_ITEM_VISUALS[itemId];
  if (visual === undefined) return undefined;
  const equipment = resolveEquipmentInfo(itemId);
  return equipment === undefined ? visual : { ...visual, stats: equipment.stats ?? {} };
}

export function getItemDisplayName(itemId: string): string {
  return getItemDefinition(itemId)?.name
    ?? CONSUMABLE_VISUALS[itemId]?.name
    ?? PRODUCTION_RESOURCE_VISUALS[itemId]?.name
    ?? ENCHANTMENT_RESOURCE_VISUALS[itemId]?.name
    ?? getCombatSpecialLootVisual(itemId)?.name
    ?? itemId.replace("item_", "").replace(/_/g, " ");
}

export function getEquipmentTierFrameClass(tier: number | undefined): string {
  return tier !== undefined && tier >= 3 && tier <= 8
    ? ` equipment-tier-frame--${String(tier)}`
    : "";
}

export function getEnchantmentTextClass(enchantment: number | undefined): string {
  return enchantment !== undefined && enchantment >= 0 && enchantment <= 4
    ? ` enchantment-text--${String(enchantment)}`
    : "";
}

/** @deprecated Compatibility only. Enchantment no longer controls frames/halos. */
export function getEnchantmentFrameClass(_enchantment: number | undefined): string {
  return "";
}

export function ItemVisual({ itemId }: { readonly itemId: string }): JSX.Element {
  const visual = getItemDefinition(itemId) ?? CONSUMABLE_VISUALS[itemId];
  const resource = PRODUCTION_RESOURCE_VISUALS[itemId];
  const enchantmentResource = ENCHANTMENT_RESOURCE_VISUALS[itemId];
  const specialLoot = getCombatSpecialLootVisual(itemId);

  if (enchantmentResource !== undefined) {
    return (
      <span
        className="item-visual__fallback item-visual__fallback--enchantment"
        aria-label={enchantmentResource.name}
      >
        {enchantmentResource.symbol}
      </span>
    );
  }
  if (specialLoot !== undefined) {
    return (
      <span
        className={`item-visual__fallback item-visual__fallback--${specialLoot.className}`}
        aria-label={specialLoot.name}
      >
        {specialLoot.symbol}
      </span>
    );
  }
  if (resource !== undefined) {
    return (
      <img
        className="item-visual__image item-visual__image--resource"
        src={`/assets/resources/${resource.icon}`}
        alt={resource.name}
        draggable={false}
      />
    );
  }
  if (visual === undefined) {
    return <span className="item-visual__fallback">{itemId.slice(0, 2).toUpperCase()}</span>;
  }
  return (
    <img
      className="item-visual__image"
      src={`/assets/items/${visual.icon}`}
      alt={visual.name}
      draggable={false}
    />
  );
}

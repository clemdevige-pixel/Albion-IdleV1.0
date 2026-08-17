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
interface SpecialLootVisualDefinition {
  readonly name: string;
  readonly className: string;
  readonly icon?: string;
  readonly symbol?: string;
}

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

const DUNGEON_KEY_ASSET_COLOR_BY_TIER: Readonly<Record<number, string>> = {
  4: "blue",
  5: "red",
  6: "orange",
  7: "yellow",
  8: "white",
};

const ARTIFACT_ASSET_FACTIONS = new Set(["heretic", "keeper", "morgana", "undead"]);

function formatFactionName(factionId: string): string {
  return FACTION_DISPLAY_NAMES[factionId] ?? factionId
    .split("_")
    .filter((part) => part.length > 0)
    .map((part) => `${part.charAt(0).toUpperCase()}${part.slice(1)}`)
    .join(" ");
}

function getTieredDungeonKeyVisual(itemId: string): SpecialLootVisualDefinition | undefined {
  const fragmentMatch = itemId.match(/^item_resource_dungeon_key_fragment_t([4-8])$/);
  if (fragmentMatch !== null) {
    const tier = Number(fragmentMatch[1]);
    const color = DUNGEON_KEY_ASSET_COLOR_BY_TIER[tier];
    return {
      name: `Fragment de clé de donjon T${String(tier)}`,
      className: "key-fragment",
      ...(color === undefined ? { symbol: "⌁" } : { icon: `fragment_key_t${String(tier)}_${color}.png` }),
    };
  }

  const keyMatch = itemId.match(/^item_resource_dungeon_key_t([4-8])$/);
  if (keyMatch !== null) {
    const tier = Number(keyMatch[1]);
    const color = DUNGEON_KEY_ASSET_COLOR_BY_TIER[tier];
    return {
      name: `Clé de donjon T${String(tier)}`,
      className: "dungeon-key",
      ...(color === undefined ? { symbol: "⚿" } : { icon: `key_t${String(tier)}_${color}.png` }),
    };
  }

  return undefined;
}

function getCombatSpecialLootVisual(itemId: string): SpecialLootVisualDefinition | undefined {
  const tieredDungeonKey = getTieredDungeonKeyVisual(itemId);
  if (tieredDungeonKey !== undefined) return tieredDungeonKey;

  const artifactFragmentPrefix = "item_resource_artifact_fragment_";
  if (itemId.startsWith(artifactFragmentPrefix)) {
    const factionId = itemId.slice(artifactFragmentPrefix.length);
    if (factionId.length === 0) return undefined;
    return {
      name: `Fragment d’artefact · ${formatFactionName(factionId)}`,
      className: "artifact-fragment",
      ...(ARTIFACT_ASSET_FACTIONS.has(factionId)
        ? { icon: `artifact-fragment-${factionId}.png` }
        : { symbol: "◈" }),
    };
  }

  const artifactPrefix = "item_resource_artifact_";
  if (itemId.startsWith(artifactPrefix)) {
    const factionId = itemId.slice(artifactPrefix.length);
    if (factionId.length === 0) return undefined;
    return {
      name: `Artefact · ${formatFactionName(factionId)}`,
      className: "artifact",
      ...(ARTIFACT_ASSET_FACTIONS.has(factionId)
        ? { icon: `artifact-${factionId}.png` }
        : { symbol: "✺" }),
    };
  }

  const keyFragmentPrefix = "item_resource_key_fragment_";
  if (itemId.startsWith(keyFragmentPrefix)) {
    const factionId = itemId.slice(keyFragmentPrefix.length);
    if (factionId.length === 0) return undefined;
    return {
      name: `Fragment de clé · ${formatFactionName(factionId)}`,
      className: "key-fragment",
      symbol: "⌁",
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
    if (specialLoot.icon !== undefined) {
      return (
        <img
          className={`item-visual__image item-visual__image--special item-visual__image--${specialLoot.className}`}
          src={`/assets/items/${specialLoot.icon}`}
          alt={specialLoot.name}
          draggable={false}
        />
      );
    }
    return (
      <span
        className={`item-visual__fallback item-visual__fallback--${specialLoot.className}`}
        aria-label={specialLoot.name}
      >
        {specialLoot.symbol ?? "?"}
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

import {
  WEAPON_ITEM_DEFINITIONS,
  getWeaponMasteryDisplayName,
  resolveWeaponMastery,
  resolveWeaponTier,
} from "../data/weaponContentCatalog";
import { resolveEquipmentPresentation } from "../data/equipmentPresentation";
import { resolveEquipmentInfo } from "../data/itemContentCatalog";
import { getFactionCapeDefinition } from "../data/factionCapeContentCatalog";
import { getRelicDefinitionByInventoryItemId } from "../data/relicContentCatalog";
import {
  PRODUCTION_RESOURCE_VISUALS,
  PROGRESSION_NON_WEAPON_VISUALS,
  type CatalogItemVisualDefinition,
} from "../data/itemVisualContentCatalog";
import "./itemRarity.css";

export type ItemVisualDefinition = CatalogItemVisualDefinition;
interface ConsumableVisualDefinition { readonly name: string; readonly icon: string; }
interface EnchantmentResourceVisualDefinition { readonly name: string; readonly icon: string; }
interface SpecialLootVisualDefinition {
  readonly name: string;
  readonly className: string;
  readonly icon?: string;
  readonly symbol?: string;
}

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

const ENCHANTMENT_RESOURCE_VISUALS: Readonly<Record<string, EnchantmentResourceVisualDefinition>> = {
  item_resource_enchantment_shard_t4: { name: "Éclat d’enchantement T4", icon: "eclat_enchantement_t4_bleu.png" },
  item_resource_enchantment_shard_t5: { name: "Éclat d’enchantement T5", icon: "eclat_enchantement_t5_rouge.png" },
  item_resource_enchantment_shard_t6: { name: "Éclat d’enchantement T6", icon: "eclat_enchantement_t6_orange.png" },
  item_resource_enchantment_shard_t7: { name: "Éclat d’enchantement T7", icon: "eclat_enchantement_t7_jaune.png" },
  item_resource_enchantment_shard_t8: { name: "Éclat d’enchantement T8", icon: "eclat_enchantement_t8_blanc.png" },
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

const FACTION_RUNE_ICON_BY_TIER: Readonly<Record<number, string>> = {
  4: "icons/speciaux/rune-t4-blue-pixel-v1.png",
  5: "icons/speciaux/rune-t5-red-pixel-v1.png",
  6: "icons/speciaux/rune-t6-orange-pixel-v1.png",
  7: "icons/speciaux/rune-t7-yellow-pixel-v1.png",
  8: "icons/speciaux/rune-t8-white-pixel-v1.png",
};

const SANCTUARY_RELIC_ICON = "icons/speciaux/sanctuary-relic-pixel-v1.png";
const SPECIAL_LOOT_ICON_ROOT = "icons/speciaux/";
const ARTIFACT_ASSET_FACTIONS = new Set(["heretic", "keeper", "morgana", "undead"]);

function formatFactionName(factionId: string): string {
  return FACTION_DISPLAY_NAMES[factionId] ?? factionId
    .split("_")
    .filter((part) => part.length > 0)
    .map((part) => `${part.charAt(0).toUpperCase()}${part.slice(1)}`)
    .join(" ");
}

function resolveSpecialLootIcon(icon: string): string {
  return icon.startsWith("icons/") ? icon : `${SPECIAL_LOOT_ICON_ROOT}${icon}`;
}

function getTieredFactionRuneVisual(itemId: string): SpecialLootVisualDefinition | undefined {
  const match = itemId.match(/^item_resource_rune_faction_t([4-8])$/);
  if (match === null) return undefined;
  const tier = Number(match[1]);
  const icon = FACTION_RUNE_ICON_BY_TIER[tier];
  return {
    name: `Rune de faction T${String(tier)}`,
    className: "faction-rune",
    ...(icon === undefined ? { symbol: "R" } : { icon }),
  };
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

function getTieredArtifactVisual(itemId: string): SpecialLootVisualDefinition | undefined {
  const fragmentMatch = itemId.match(/^item_resource_artifact_fragment_(heretic|keeper|morgana|undead)(?:_t([5-8]))?$/);
  if (fragmentMatch !== null) {
    const factionId = fragmentMatch[1];
    if (factionId === undefined) return undefined;
    const tier = fragmentMatch[2] === undefined ? 4 : Number(fragmentMatch[2]);
    return {
      name: `Fragment d’artefact ${formatFactionName(factionId)} T${String(tier)}`,
      className: "artifact-fragment",
      icon: `artifact-fragment-${factionId}.png`,
    };
  }

  const artifactMatch = itemId.match(/^item_resource_artifact_(heretic|keeper|morgana|undead)(?:_t([5-8]))?$/);
  if (artifactMatch !== null) {
    const factionId = artifactMatch[1];
    if (factionId === undefined) return undefined;
    const tier = artifactMatch[2] === undefined ? 4 : Number(artifactMatch[2]);
    return {
      name: `Artefact ${formatFactionName(factionId)} T${String(tier)}`,
      className: "artifact",
      icon: `artifact-${factionId}.png`,
    };
  }

  return undefined;
}

function getCombatSpecialLootVisual(itemId: string): SpecialLootVisualDefinition | undefined {
  const relic = getRelicDefinitionByInventoryItemId(itemId);
  if (relic !== undefined) {
    return {
      name: "Relique des Sanctuaires",
      className: "relic",
      icon: SANCTUARY_RELIC_ICON,
    };
  }

  const factionRune = getTieredFactionRuneVisual(itemId);
  if (factionRune !== undefined) return factionRune;

  const tieredDungeonKey = getTieredDungeonKeyVisual(itemId);
  if (tieredDungeonKey !== undefined) return tieredDungeonKey;

  const tieredArtifact = getTieredArtifactVisual(itemId);
  if (tieredArtifact !== undefined) return tieredArtifact;

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

function getWeaponDisplayName(itemId: string): string | undefined {
  const tier = resolveWeaponTier(itemId);
  const mastery = resolveWeaponMastery(itemId);
  if (tier === undefined || mastery === undefined) return undefined;
  const specializationName = getWeaponMasteryDisplayName(mastery.weaponId);
  return specializationName === undefined ? undefined : `${specializationName} T${String(tier)}`;
}

function getWeaponItemDefinition(itemId: string): ItemVisualDefinition | undefined {
  const equipment = WEAPON_ITEM_DEFINITIONS[itemId];
  const tier = resolveWeaponTier(itemId);
  const presentation = resolveEquipmentPresentation(itemId);
  const name = getWeaponDisplayName(itemId);
  if (
    equipment === undefined
    || tier === undefined
    || presentation === undefined
    || name === undefined
  ) {
    return undefined;
  }
  return {
    name,
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
  return getWeaponDisplayName(itemId)
    ?? getItemDefinition(itemId)?.name
    ?? getFactionCapeDefinition(itemId)?.name
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
      <img
        className="item-visual__image item-visual__image--special item-visual__image--enchantment"
        src={`/assets/items/${enchantmentResource.icon}`}
        alt={enchantmentResource.name}
        draggable={false}
      />
    );
  }
  if (specialLoot !== undefined) {
    if (specialLoot.icon !== undefined) {
      return (
        <img
          className={`item-visual__image item-visual__image--special item-visual__image--${specialLoot.className}`}
          src={`/assets/items/${resolveSpecialLootIcon(specialLoot.icon)}`}
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

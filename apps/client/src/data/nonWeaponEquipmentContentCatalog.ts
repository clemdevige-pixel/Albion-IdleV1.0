import type { EquipmentInfoLike } from "@game/gameplay";
import type { ProductionTier } from "./productionFamilyCatalog.js";

export type EquipmentCraftMaterialKind = "wood" | "metal" | "leather" | "cloth";

export interface EquipmentCraftMaterial {
  readonly kind: EquipmentCraftMaterialKind;
  readonly quantity: number;
}

interface ProgressionEquipmentItemContent {
  readonly itemId: string;
  readonly recipeId: string;
  readonly name: string;
  readonly tier: ProductionTier;
  readonly stats: NonNullable<EquipmentInfoLike["stats"]>;
  readonly craftMaterials: readonly EquipmentCraftMaterial[];
}

interface ProgressionEquipmentFamilyContent {
  readonly familyId: string;
  readonly recipeFamily: "armor" | "offhand";
  readonly slot: EquipmentInfoLike["slot"];
  readonly handling: EquipmentInfoLike["handling"];
  readonly items: readonly ProgressionEquipmentItemContent[];
}

/**
 * Authoritative tier progression for conventional non-weapon equipment.
 *
 * Each family owns its tier variants once. Craft recipes, item definitions and
 * Tn-1 predecessor links are derived from this catalog, mirroring the existing
 * weapon-content architecture. Adding T6+ to an existing family should only
 * require another authored item entry plus the corresponding refined materials.
 */
export const PROGRESSION_EQUIPMENT_CONTENT = [
  {
    familyId: "reinforced_shield",
    recipeFamily: "offhand",
    slot: "off_hand",
    handling: "one_handed",
    items: [
      {
        itemId: "item_shield_t3_reinforced",
        recipeId: "CRAFT_REINFORCED_SHIELD_T3_0",
        name: "Bouclier renforcé T3",
        tier: 3,
        stats: { stat_armor: 9, stat_magic_resistance: 5 },
        craftMaterials: [
          { kind: "wood", quantity: 3 },
          { kind: "metal", quantity: 2 },
          { kind: "leather", quantity: 1 },
        ],
      },
      {
        itemId: "item_shield_t4_reinforced",
        recipeId: "CRAFT_REINFORCED_SHIELD_T4_0",
        name: "Bouclier renforcé T4",
        tier: 4,
        stats: { stat_armor: 15, stat_magic_resistance: 9 },
        craftMaterials: [
          { kind: "wood", quantity: 4 },
          { kind: "metal", quantity: 4 },
          { kind: "leather", quantity: 2 },
        ],
      },
      {
        itemId: "item_shield_t5_reinforced",
        recipeId: "CRAFT_REINFORCED_SHIELD_T5_0",
        name: "Bouclier renforcé T5",
        tier: 5,
        stats: { stat_armor: 22, stat_magic_resistance: 13 },
        craftMaterials: [
          { kind: "wood", quantity: 5 },
          { kind: "metal", quantity: 5 },
          { kind: "leather", quantity: 3 },
        ],
      },
    ],
  },
  {
    familyId: "reinforced_helmet",
    recipeFamily: "armor",
    slot: "head",
    handling: "one_handed",
    items: [
      {
        itemId: "item_iron_helmet",
        recipeId: "CRAFT_IRON_HELMET_T3_0",
        name: "Casque en fer T3",
        tier: 3,
        stats: { stat_armor: 6, stat_magic_resistance: 4, stat_max_health: 85 },
        craftMaterials: [
          { kind: "metal", quantity: 4 },
          { kind: "leather", quantity: 1 },
        ],
      },
      {
        itemId: "item_helmet_t4_reinforced",
        recipeId: "CRAFT_REINFORCED_HELMET_T4_0",
        name: "Casque renforcé T4",
        tier: 4,
        stats: { stat_armor: 10, stat_magic_resistance: 7, stat_max_health: 115 },
        craftMaterials: [
          { kind: "metal", quantity: 6 },
          { kind: "leather", quantity: 2 },
        ],
      },
      {
        itemId: "item_helmet_t5_reinforced",
        recipeId: "CRAFT_REINFORCED_HELMET_T5_0",
        name: "Casque renforcé T5",
        tier: 5,
        stats: { stat_armor: 15, stat_magic_resistance: 11, stat_max_health: 160 },
        craftMaterials: [
          { kind: "metal", quantity: 7 },
          { kind: "leather", quantity: 3 },
        ],
      },
    ],
  },
  {
    familyId: "leather_armor",
    recipeFamily: "armor",
    slot: "chest",
    handling: "one_handed",
    items: [
      {
        itemId: "item_leather_armor",
        recipeId: "CRAFT_LEATHER_ARMOR_T3_0",
        name: "Armure de cuir T3",
        tier: 3,
        stats: { stat_armor: 11, stat_magic_resistance: 8, stat_max_health: 145 },
        craftMaterials: [
          { kind: "leather", quantity: 4 },
          { kind: "cloth", quantity: 2 },
        ],
      },
      {
        itemId: "item_armor_t4_leather",
        recipeId: "CRAFT_LEATHER_ARMOR_T4_0",
        name: "Armure de cuir T4",
        tier: 4,
        stats: { stat_armor: 18, stat_magic_resistance: 12, stat_max_health: 185 },
        craftMaterials: [
          { kind: "leather", quantity: 6 },
          { kind: "cloth", quantity: 3 },
        ],
      },
      {
        itemId: "item_armor_t5_leather",
        recipeId: "CRAFT_LEATHER_ARMOR_T5_0",
        name: "Armure de cuir T5",
        tier: 5,
        stats: { stat_armor: 26, stat_magic_resistance: 18, stat_max_health: 260 },
        craftMaterials: [
          { kind: "leather", quantity: 7 },
          { kind: "cloth", quantity: 4 },
        ],
      },
    ],
  },
  {
    familyId: "leather_boots",
    recipeFamily: "armor",
    slot: "boots",
    handling: "one_handed",
    items: [
      {
        itemId: "item_leather_boots",
        recipeId: "CRAFT_LEATHER_BOOTS_T3_0",
        name: "Bottes de cuir T3",
        tier: 3,
        stats: { stat_armor: 4, stat_magic_resistance: 3 },
        craftMaterials: [
          { kind: "leather", quantity: 3 },
          { kind: "cloth", quantity: 1 },
        ],
      },
      {
        itemId: "item_boots_t4_leather",
        recipeId: "CRAFT_LEATHER_BOOTS_T4_0",
        name: "Bottes de cuir T4",
        tier: 4,
        stats: { stat_armor: 8, stat_magic_resistance: 5 },
        craftMaterials: [
          { kind: "leather", quantity: 4 },
          { kind: "cloth", quantity: 2 },
        ],
      },
      {
        itemId: "item_boots_t5_leather",
        recipeId: "CRAFT_LEATHER_BOOTS_T5_0",
        name: "Bottes de cuir T5",
        tier: 5,
        stats: { stat_armor: 11, stat_magic_resistance: 7 },
        craftMaterials: [
          { kind: "leather", quantity: 5 },
          { kind: "cloth", quantity: 3 },
        ],
      },
    ],
  },
] as const satisfies readonly ProgressionEquipmentFamilyContent[];

export type ProgressionEquipmentFamily = (typeof PROGRESSION_EQUIPMENT_CONTENT)[number];
export type ProgressionEquipmentItem = ProgressionEquipmentFamily["items"][number];

interface ProgressionEquipmentItemRoute {
  readonly family: ProgressionEquipmentFamily;
  readonly item: ProgressionEquipmentItem;
}

const ROUTE_BY_ITEM_ID = new Map<string, ProgressionEquipmentItemRoute>(
  PROGRESSION_EQUIPMENT_CONTENT.flatMap((family) =>
    family.items.map((item) => [item.itemId, { family, item }] as const),
  ),
);

export const PROGRESSION_NON_WEAPON_ITEM_DEFINITIONS: Readonly<
  Record<string, EquipmentInfoLike>
> = Object.fromEntries(
  PROGRESSION_EQUIPMENT_CONTENT.flatMap((family) =>
    family.items.map((item) => [
      item.itemId,
      {
        itemId: item.itemId,
        slot: family.slot,
        handling: family.handling,
        stats: item.stats,
      },
    ] as const),
  ),
);

export function resolveProgressionEquipmentRoute(
  itemId: string,
): ProgressionEquipmentItemRoute | undefined {
  return ROUTE_BY_ITEM_ID.get(itemId);
}

export function resolvePreviousProgressionEquipmentItemId(
  itemId: string,
): string | undefined {
  const route = resolveProgressionEquipmentRoute(itemId);
  if (route === undefined) return undefined;
  const previous = route.family.items.find(
    (candidate) => candidate.tier === route.item.tier - 1,
  );
  return previous?.itemId;
}

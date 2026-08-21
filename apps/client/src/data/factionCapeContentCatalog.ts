import type { EquipmentInfoLike } from "@game/gameplay";
import type { ClientCraftRecipe } from "./specialCraftRecipes.js";
import type { ProductionTier } from "./productionFamilyCatalog.js";
import { getClothRecipe, getLeatherRecipe } from "./refiningRecipes.js";

export interface FactionCapeContentDefinition {
  readonly factionId: string;
  readonly tier: Exclude<ProductionTier, 3>;
  readonly itemId: string;
  readonly recipeId: string;
  readonly name: string;
  readonly stats: NonNullable<EquipmentInfoLike["stats"]>;
  readonly runeItemId: string;
  readonly runeQuantity: number;
  readonly clothQuantity: number;
  readonly leatherQuantity: number;
  readonly dungeonDamageReductionPercent: number;
}

export const KEEPER_CAPE_CONTENT = [
  { tier: 4, armor: 3, magicResistance: 5, cloth: 3, leather: 1, runes: 3, reduction: 6 },
  { tier: 5, armor: 4, magicResistance: 7, cloth: 4, leather: 2, runes: 4, reduction: 8 },
  { tier: 6, armor: 6, magicResistance: 10, cloth: 5, leather: 2, runes: 5, reduction: 11 },
  { tier: 7, armor: 9, magicResistance: 14, cloth: 6, leather: 3, runes: 6, reduction: 14 },
  { tier: 8, armor: 13, magicResistance: 20, cloth: 8, leather: 4, runes: 8, reduction: 18 },
].map((entry): FactionCapeContentDefinition => ({
  factionId: "keeper",
  tier: entry.tier,
  itemId: `item_cape_t${String(entry.tier)}_keeper`,
  recipeId: `CRAFT_KEEPER_CAPE_T${String(entry.tier)}_0`,
  name: `Cape Keeper T${String(entry.tier)}`,
  stats: {
    stat_armor: entry.armor,
    stat_magic_resistance: entry.magicResistance,
  },
  runeItemId: `item_resource_rune_keeper_t${String(entry.tier)}`,
  runeQuantity: entry.runes,
  clothQuantity: entry.cloth,
  leatherQuantity: entry.leather,
  dungeonDamageReductionPercent: entry.reduction,
}));

export const FACTION_CAPE_ITEM_DEFINITIONS: Readonly<Record<string, EquipmentInfoLike>> = Object.fromEntries(
  KEEPER_CAPE_CONTENT.map((cape) => [
    cape.itemId,
    {
      itemId: cape.itemId,
      slot: "cape",
      handling: "one_handed",
      stats: cape.stats,
    },
  ]),
);

export const FACTION_CAPE_CRAFT_RECIPES: readonly ClientCraftRecipe[] = KEEPER_CAPE_CONTENT.map(
  (cape) => ({
    id: cape.recipeId,
    family: "cape",
    name: cape.name,
    tier: cape.tier,
    outputItemId: cape.itemId,
    durationTicks: 0,
    requirements: [
      { itemId: getClothRecipe(cape.tier).outputItemId, quantity: cape.clothQuantity },
      { itemId: getLeatherRecipe(cape.tier).outputItemId, quantity: cape.leatherQuantity },
      { itemId: cape.runeItemId, quantity: cape.runeQuantity },
    ],
  }),
);

export function getFactionCapeDefinition(itemId: string): FactionCapeContentDefinition | undefined {
  return KEEPER_CAPE_CONTENT.find((cape) => cape.itemId === itemId);
}

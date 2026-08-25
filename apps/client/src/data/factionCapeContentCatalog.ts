import {
  FACTION_CAPE_BALANCE,
  FACTION_CAPE_FACTIONS,
  getFactionRuneItemId,
  type FactionCapeTier,
} from "@game/data";
import type { EquipmentInfoLike } from "@game/gameplay";
import type { ClientCraftRecipe } from "./specialCraftRecipes.js";
import { getClothRecipe, getLeatherRecipe } from "./refiningRecipes.js";

export interface FactionCapeContentDefinition {
  readonly factionId: string;
  readonly tier: FactionCapeTier;
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

export interface FactionDungeonContext {
  readonly factionId: string;
  readonly tier: number;
}

export const FACTION_CAPE_CONTENT: readonly FactionCapeContentDefinition[] = FACTION_CAPE_FACTIONS.flatMap(
  (faction) => FACTION_CAPE_BALANCE.map((entry) => ({
    factionId: faction.factionId,
    tier: entry.tier,
    itemId: `item_cape_t${String(entry.tier)}_${faction.factionId}`,
    recipeId: `CRAFT_${faction.factionId.toUpperCase()}_CAPE_T${String(entry.tier)}_0`,
    name: `Cape ${faction.displayName} T${String(entry.tier)}`,
    stats: {
      stat_armor: entry.armor,
      stat_magic_resistance: entry.magicResistance,
    },
    runeItemId: getFactionRuneItemId(entry.tier),
    runeQuantity: entry.runeQuantity,
    clothQuantity: entry.clothQuantity,
    leatherQuantity: entry.leatherQuantity,
    dungeonDamageReductionPercent: entry.dungeonDamageReductionPercent,
  })),
);

export const KEEPER_CAPE_CONTENT = FACTION_CAPE_CONTENT.filter(
  (cape) => cape.factionId === "keeper",
);

export const FACTION_CAPE_ITEM_DEFINITIONS: Readonly<Record<string, EquipmentInfoLike>> = Object.fromEntries(
  FACTION_CAPE_CONTENT.map((cape) => [
    cape.itemId,
    {
      itemId: cape.itemId,
      slot: "cape",
      handling: "one_handed",
      stats: cape.stats,
    },
  ]),
);

export const FACTION_CAPE_CRAFT_RECIPES: readonly ClientCraftRecipe[] = FACTION_CAPE_CONTENT.map(
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
  return FACTION_CAPE_CONTENT.find((cape) => cape.itemId === itemId);
}

export function resolveFactionCapeDungeonDamageReductionPercent(
  capeItemId: string,
  dungeon: FactionDungeonContext,
): number {
  const cape = getFactionCapeDefinition(capeItemId);
  if (cape === undefined) return 0;
  if (cape.factionId !== dungeon.factionId.toLowerCase()) return 0;
  if (cape.tier > dungeon.tier) return 0;
  return cape.dungeonDamageReductionPercent;
}

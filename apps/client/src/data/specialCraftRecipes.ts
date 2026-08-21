import {
  ARTIFACT_FRAGMENTS_PER_CRAFT_CHARGE,
  KEY_FRAGMENTS_PER_KEY,
} from "./economyContentCatalog.js";
import { FACTION_CAPE_CRAFT_RECIPES } from "./factionCapeContentCatalog.js";
import { EQUIPMENT_CRAFT_RECIPES } from "./refiningRecipes.js";

export interface ClientCraftRecipe {
  readonly id: string;
  readonly family: string;
  readonly name: string;
  readonly tier: number;
  readonly outputItemId: string;
  readonly durationTicks: number;
  readonly requirements: readonly { itemId: string; quantity: number }[];
}

const BLUE_ZONE_FACTION_CRAFTING = [
  { id: "animal", name: "Animal", tier: 3 },
  { id: "undead", name: "Undead", tier: 3 },
  { id: "morgana", name: "Morgana", tier: 3 },
  { id: "keeper", name: "Keeper", tier: 4 },
  { id: "heretic", name: "Heretic", tier: 4 },
] as const;

export const SPECIAL_CRAFT_RECIPES: readonly ClientCraftRecipe[] = BLUE_ZONE_FACTION_CRAFTING.flatMap((faction) => [
  {
    id: `CRAFT_DUNGEON_KEY_${faction.id.toUpperCase()}`,
    family: "other_key",
    name: `Clé de donjon · ${faction.name}`,
    tier: faction.tier,
    outputItemId: `item_resource_dungeon_key_${faction.id}`,
    durationTicks: 0,
    requirements: [
      {
        itemId: `item_resource_key_fragment_${faction.id}`,
        quantity: KEY_FRAGMENTS_PER_KEY,
      },
    ],
  },
  {
    id: `CRAFT_ARTIFACT_${faction.id.toUpperCase()}`,
    family: "other_artifact",
    name: `Artefact · ${faction.name}`,
    tier: faction.tier,
    outputItemId: `item_resource_artifact_${faction.id}`,
    durationTicks: 0,
    requirements: [
      {
        itemId: `item_resource_artifact_fragment_${faction.id}`,
        quantity: ARTIFACT_FRAGMENTS_PER_CRAFT_CHARGE,
      },
    ],
  },
]);

export const ALL_CRAFT_RECIPES: readonly ClientCraftRecipe[] = [
  ...EQUIPMENT_CRAFT_RECIPES,
  ...FACTION_CAPE_CRAFT_RECIPES,
  ...SPECIAL_CRAFT_RECIPES,
];

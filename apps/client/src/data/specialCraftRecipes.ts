import {
  ARTIFACT_FRAGMENTS_PER_CRAFT_CHARGE,
  KEY_FRAGMENTS_PER_KEY,
} from "./economyContentCatalog.js";
import {
  DUNGEON_ARTIFACT_FACTIONS,
  DUNGEON_ARTIFACT_TIERS,
  getDungeonArtifactFragmentItemId,
  getDungeonArtifactItemId,
} from "./dungeonArtifactContentCatalog.js";
import {
  getDungeonKeyFragmentItemId,
  getDungeonKeyItemId,
} from "./dungeonKeyContentCatalog.js";
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

const FACTION_DISPLAY_NAMES = {
  keeper: "Keeper",
  heretic: "Hérétique",
  undead: "Mort-vivant",
  morgana: "Morgana",
} as const;

const DUNGEON_KEY_CRAFT_RECIPES: readonly ClientCraftRecipe[] = DUNGEON_ARTIFACT_TIERS.map((tier) => ({
  id: `CRAFT_DUNGEON_KEY_T${String(tier)}`,
  family: "other_key",
  name: `Clé de donjon T${String(tier)}`,
  tier,
  outputItemId: getDungeonKeyItemId(tier),
  durationTicks: 0,
  requirements: [
    {
      itemId: getDungeonKeyFragmentItemId(tier),
      quantity: KEY_FRAGMENTS_PER_KEY,
    },
  ],
}));

const DUNGEON_ARTIFACT_CRAFT_RECIPES: readonly ClientCraftRecipe[] = DUNGEON_ARTIFACT_TIERS.flatMap((tier) => (
  DUNGEON_ARTIFACT_FACTIONS.map((faction) => ({
    id: `CRAFT_ARTIFACT_${faction.toUpperCase()}_T${String(tier)}`,
    family: "other_artifact",
    name: `Artefact ${FACTION_DISPLAY_NAMES[faction]} T${String(tier)}`,
    tier,
    outputItemId: getDungeonArtifactItemId(faction, tier),
    durationTicks: 0,
    requirements: [
      {
        itemId: getDungeonArtifactFragmentItemId(faction, tier),
        quantity: ARTIFACT_FRAGMENTS_PER_CRAFT_CHARGE,
      },
    ],
  }))
));

export const SPECIAL_CRAFT_RECIPES: readonly ClientCraftRecipe[] = [
  ...DUNGEON_KEY_CRAFT_RECIPES,
  ...DUNGEON_ARTIFACT_CRAFT_RECIPES,
];

export const ALL_CRAFT_RECIPES: readonly ClientCraftRecipe[] = [
  ...EQUIPMENT_CRAFT_RECIPES,
  ...FACTION_CAPE_CRAFT_RECIPES,
  ...SPECIAL_CRAFT_RECIPES,
];

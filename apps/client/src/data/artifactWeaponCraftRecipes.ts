import { getFactionRuneItemId } from "@game/data";
import {
  getWeaponSpecializationName,
  resolveWeaponArtifactFaction,
  resolveWeaponFamilyId,
  resolveWeaponTier,
  WEAPON_ITEM_DEFINITIONS,
  type WeaponFamilyId,
} from "./weaponContentCatalog.js";
import {
  getDungeonArtifactItemId,
  type DungeonArtifactFactionId,
  type DungeonArtifactTier,
} from "./dungeonArtifactContentCatalog.js";
import { STANDARD_WEAPON_CRAFT_RECIPES } from "./refiningRecipes.js";

export const ARTIFACT_WEAPON_RUNE_COST_BY_TIER = {
  4: 5,
  5: 10,
  6: 20,
  7: 35,
  8: 55,
} as const satisfies Readonly<Record<DungeonArtifactTier, number>>;

const DUNGEON_FACTION_BY_ARTIFACT_FACTION = {
  Keeper: "keeper",
  Morgana: "morgana",
  Undead: "undead",
  Heretic: "heretic",
} as const satisfies Readonly<Record<string, DungeonArtifactFactionId>>;

export interface ArtifactWeaponCraftRecipe {
  readonly id: string;
  readonly family: WeaponFamilyId;
  readonly name: string;
  readonly tier: DungeonArtifactTier;
  readonly outputItemId: string;
  readonly durationTicks: number;
  readonly requirements: readonly {
    readonly itemId: string;
    readonly quantity: number;
  }[];
}

function isArtifactWeaponTier(tier: number | undefined): tier is DungeonArtifactTier {
  return tier === 4 || tier === 5 || tier === 6 || tier === 7 || tier === 8;
}

function getBaseFamilyRecipe(family: WeaponFamilyId, tier: DungeonArtifactTier) {
  return STANDARD_WEAPON_CRAFT_RECIPES.find((recipe) => (
    recipe.family === family && recipe.tier === tier
  ));
}

function createArtifactWeaponCraftRecipe(itemId: string): ArtifactWeaponCraftRecipe | undefined {
  const artifactFaction = resolveWeaponArtifactFaction(itemId);
  if (artifactFaction === undefined) return undefined;

  const tier = resolveWeaponTier(itemId);
  const family = resolveWeaponFamilyId(itemId);
  const name = getWeaponSpecializationName(itemId);
  if (!isArtifactWeaponTier(tier) || family === undefined || name === undefined) return undefined;

  const baseRecipe = getBaseFamilyRecipe(family, tier);
  if (baseRecipe === undefined) {
    throw new Error(`Missing standard ${family} T${String(tier)} recipe for artifact weapon ${itemId}`);
  }

  const factionId = DUNGEON_FACTION_BY_ARTIFACT_FACTION[artifactFaction];
  return {
    id: `CRAFT_${itemId.replace("item_weapon_", "").toUpperCase()}_0`,
    family,
    name: `${name} T${String(tier)}`,
    tier,
    outputItemId: itemId,
    durationTicks: 0,
    requirements: [
      ...baseRecipe.requirements,
      { itemId: getDungeonArtifactItemId(factionId, tier), quantity: 1 },
      {
        itemId: getFactionRuneItemId(tier),
        quantity: ARTIFACT_WEAPON_RUNE_COST_BY_TIER[tier],
      },
    ],
  };
}

export const ARTIFACT_WEAPON_CRAFT_RECIPES: readonly ArtifactWeaponCraftRecipe[] = Object.keys(
  WEAPON_ITEM_DEFINITIONS,
).map(createArtifactWeaponCraftRecipe).filter(
  (recipe): recipe is ArtifactWeaponCraftRecipe => recipe !== undefined,
);

const ARTIFACT_WEAPON_OUTPUT_IDS = new Set(
  ARTIFACT_WEAPON_CRAFT_RECIPES.map((recipe) => recipe.outputItemId),
);

export function isArtifactWeaponCraftOutput(itemId: string): boolean {
  return ARTIFACT_WEAPON_OUTPUT_IDS.has(itemId);
}

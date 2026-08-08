import { asMasteryId, asDestinyNodeId, WEAPON_MASTERY_XP, GATHERING_MASTERY_XP } from "@game/gameplay";
import { WEAPON_MASTERY_DEFINITIONS, getWeaponMasteryDisplayName } from "./weaponContentCatalog.js";

export const SWORD_MASTERY_ID = asMasteryId("mastery_sword");
export const BOW_MASTERY_ID = asMasteryId("mastery_bow");
export const FIRE_STAFF_MASTERY_ID = asMasteryId("mastery_fire_staff");
export const GLOVES_MASTERY_ID = asMasteryId("mastery_gloves");
export const BROADSWORD_MASTERY_ID = asMasteryId("mastery_broadsword");
export const LONGBOW_MASTERY_ID = asMasteryId("mastery_longbow");
export const BADON_MASTERY_ID = asMasteryId("mastery_badon");
export const T4_FIRE_STAFF_MASTERY_ID = asMasteryId("mastery_t4_fire_staff");
export const SPIKED_GAUNTLETS_MASTERY_ID = asMasteryId("mastery_spiked_gauntlets");
export const WOOD_GATHERING_MASTERY_ID = asMasteryId("mastery_gathering_wood");
export const ORE_GATHERING_MASTERY_ID = asMasteryId("mastery_gathering_ore");
export const HIDE_GATHERING_MASTERY_ID = asMasteryId("mastery_gathering_hide");
export const FIBER_GATHERING_MASTERY_ID = asMasteryId("mastery_gathering_fiber");

export { WEAPON_MASTERY_XP, GATHERING_MASTERY_XP };


export const GATHERING_MASTERY_DEFINITIONS = [
  { id: "mastery_gathering_wood", category: "gathering", maxLevel: 100, experiencePerLevel: GATHERING_MASTERY_XP },
  { id: "mastery_gathering_ore", category: "gathering", maxLevel: 100, experiencePerLevel: GATHERING_MASTERY_XP },
  { id: "mastery_gathering_hide", category: "gathering", maxLevel: 100, experiencePerLevel: GATHERING_MASTERY_XP },
  { id: "mastery_gathering_fiber", category: "gathering", maxLevel: 100, experiencePerLevel: GATHERING_MASTERY_XP },
];

const GATHERING_MASTERY_NAMES: Readonly<Record<string, string>> = {
  mastery_gathering_wood: "Récolte du bois",
  mastery_gathering_ore: "Extraction du minerai",
  mastery_gathering_hide: "Dépeçage",
  mastery_gathering_fiber: "Récolte des fibres",
};

export function getGatheringMasteryDisplayName(masteryId: string): string | undefined {
  return GATHERING_MASTERY_NAMES[masteryId];
}

export function getHeroGatheringXpForTier(tier: number): number {
  return Math.max(1, Math.round(5 * (1.6 ** Math.max(0, tier - 3))));
}

export function getWorkerGatheringXpForTier(tier: number): number {
  return Math.max(1, Math.round(4 * (1.5 ** Math.max(0, tier - 3))));
}

export function getHeroGatheringXpFromWorkerForTier(tier: number): number {
  return Math.max(1, Math.round(2 * (1.5 ** Math.max(0, tier - 3))));
}

export function getRequiredGatheringMasteryForTier(tier: number): number {
  // Local QA escape hatch: enables production-pipeline testing without
  // changing progression balance or affecting deployed builds.
  if (
    import.meta.env.DEV
    && typeof window !== "undefined"
    && new URLSearchParams(window.location.search).get("productionTest") === "1"
  ) {
    return 0;
  }
  return Math.max(0, tier - 3) * 3;
}

export const MASTERY_DEFINITIONS = [
  ...WEAPON_MASTERY_DEFINITIONS,
  ...GATHERING_MASTERY_DEFINITIONS,
  {
    id: "mastery_sword",
    category: "weapon",
    maxLevel: 100,
    experiencePerLevel: WEAPON_MASTERY_XP,
  },
  {
    id: "mastery_bow",
    category: "weapon",
    maxLevel: 100,
    experiencePerLevel: WEAPON_MASTERY_XP,
  },
  {
    id: "mastery_fire_staff",
    category: "weapon",
    maxLevel: 100,
    experiencePerLevel: WEAPON_MASTERY_XP,
  },
  {
    id: "mastery_gloves",
    category: "weapon",
    maxLevel: 100,
    experiencePerLevel: WEAPON_MASTERY_XP,
  },
  {
    id: "mastery_broadsword",
    category: "weapon_specialization",
    maxLevel: 100,
    experiencePerLevel: WEAPON_MASTERY_XP,
  },
  {
    id: "mastery_longbow",
    category: "weapon_specialization",
    maxLevel: 100,
    experiencePerLevel: WEAPON_MASTERY_XP,
  },
  {
    id: "mastery_badon",
    category: "weapon_specialization",
    maxLevel: 100,
    experiencePerLevel: WEAPON_MASTERY_XP,
  },
  {
    id: "mastery_t4_fire_staff",
    category: "weapon_specialization",
    maxLevel: 100,
    experiencePerLevel: WEAPON_MASTERY_XP,
  },
  {
    id: "mastery_spiked_gauntlets",
    category: "weapon_specialization",
    maxLevel: 100,
    experiencePerLevel: WEAPON_MASTERY_XP,
  },
  {
    id: "mastery_gathering_wood",
    category: "gathering",
    maxLevel: 100,
    experiencePerLevel: GATHERING_MASTERY_XP,
  },
  {
    id: "mastery_gathering_ore",
    category: "gathering",
    maxLevel: 100,
    experiencePerLevel: GATHERING_MASTERY_XP,
  },
  {
    id: "mastery_gathering_hide",
    category: "gathering",
    maxLevel: 100,
    experiencePerLevel: GATHERING_MASTERY_XP,
  },
  {
    id: "mastery_gathering_fiber",
    category: "gathering",
    maxLevel: 100,
    experiencePerLevel: GATHERING_MASTERY_XP,
  },
];

export function getMasteryDisplayName(masteryId: string): string {
  const catalogName = getWeaponMasteryDisplayName(masteryId);
  if (catalogName !== undefined) return catalogName;
  const gatheringCatalogName = getGatheringMasteryDisplayName(masteryId);
  if (gatheringCatalogName !== undefined) return gatheringCatalogName;
  switch (masteryId) {
    case "mastery_sword":
      return "Épées";
    case "mastery_bow":
      return "Arcs";
    case "mastery_fire_staff":
      return "Bâtons de feu";
    case "mastery_gloves":
      return "Gants";
    case "mastery_broadsword":
      return "Épée large";
    case "mastery_longbow":
      return "Arc long";
    case "mastery_badon":
      return "Badon";
    case "mastery_t4_fire_staff":
      return "Bâton de feu T4";
    case "mastery_spiked_gauntlets":
      return "Gantelets à pointes";
    case "mastery_gathering_wood":
      return "Récolte du bois";
    case "mastery_gathering_ore":
      return "Extraction du minerai";
    case "mastery_gathering_hide":
      return "Dépeçage";
    case "mastery_gathering_fiber":
      return "Récolte des fibres";
    default:
      return masteryId;
  }
}

export const DESTINY_NODES = [
  {
    id: asDestinyNodeId("node_sword_1"),
    displayName: "Initié à l'épée",
    category: "weapon",
    prerequisites: [] as ReturnType<typeof asDestinyNodeId>[],
    requirements: [{ type: "mastery_level" as const, masteryId: SWORD_MASTERY_ID, level: 1 }],
    rewards: [{ type: "equipment_tier_unlock" as const, tier: 2 }],
  },
  {
    id: asDestinyNodeId("node_sword_2"),
    displayName: "Adepte de l'épée",
    category: "weapon",
    prerequisites: [asDestinyNodeId("node_sword_1")],
    requirements: [{ type: "mastery_level" as const, masteryId: SWORD_MASTERY_ID, level: 3 }],
    rewards: [{ type: "equipment_tier_unlock" as const, tier: 3 }],
  },
];


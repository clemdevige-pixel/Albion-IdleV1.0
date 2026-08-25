import {
  GATHERING_MASTERY_ID_VALUES,
  GATHERING_MASTERY_MAX_LEVEL,
  GATHERING_MASTERY_UNLOCK_BY_TIER,
  HERO_GATHERING_XP_BY_TIER,
  HERO_GATHERING_XP_FROM_WORKER_BY_TIER,
  WORKER_GATHERING_XP_BY_TIER,
} from "@game/data";
import {
  asMasteryId,
  asDestinyNodeId,
  WEAPON_MASTERY_XP,
  GATHERING_MASTERY_XP,
} from "@game/gameplay";
import {
  WEAPON_MASTERY_DEFINITIONS,
  getWeaponMasteryDisplayName,
} from "./weaponContentCatalog.js";
import {
  FACTION_MASTERY_DEFINITIONS,
  getFactionMasteryDisplayName,
} from "./factionMasteryContentCatalog.js";

export const WOOD_GATHERING_MASTERY_ID = asMasteryId(GATHERING_MASTERY_ID_VALUES.wood);
export const ORE_GATHERING_MASTERY_ID = asMasteryId(GATHERING_MASTERY_ID_VALUES.ore);
export const HIDE_GATHERING_MASTERY_ID = asMasteryId(GATHERING_MASTERY_ID_VALUES.hide);
export const FIBER_GATHERING_MASTERY_ID = asMasteryId(GATHERING_MASTERY_ID_VALUES.fiber);

export { WEAPON_MASTERY_XP, GATHERING_MASTERY_XP };
export { GATHERING_MASTERY_UNLOCK_BY_TIER } from "@game/data";

export const GATHERING_MASTERY_DEFINITIONS = [
  { id: GATHERING_MASTERY_ID_VALUES.wood, category: "gathering", maxLevel: GATHERING_MASTERY_MAX_LEVEL, experiencePerLevel: GATHERING_MASTERY_XP },
  { id: GATHERING_MASTERY_ID_VALUES.ore, category: "gathering", maxLevel: GATHERING_MASTERY_MAX_LEVEL, experiencePerLevel: GATHERING_MASTERY_XP },
  { id: GATHERING_MASTERY_ID_VALUES.hide, category: "gathering", maxLevel: GATHERING_MASTERY_MAX_LEVEL, experiencePerLevel: GATHERING_MASTERY_XP },
  { id: GATHERING_MASTERY_ID_VALUES.fiber, category: "gathering", maxLevel: GATHERING_MASTERY_MAX_LEVEL, experiencePerLevel: GATHERING_MASTERY_XP },
];

const GATHERING_MASTERY_NAMES: Readonly<Record<string, string>> = {
  [GATHERING_MASTERY_ID_VALUES.wood]: "Récolte du bois",
  [GATHERING_MASTERY_ID_VALUES.ore]: "Extraction du minerai",
  [GATHERING_MASTERY_ID_VALUES.hide]: "Dépeçage",
  [GATHERING_MASTERY_ID_VALUES.fiber]: "Récolte des fibres",
};

export function getGatheringMasteryDisplayName(masteryId: string): string | undefined {
  return GATHERING_MASTERY_NAMES[masteryId];
}

export function getHeroGatheringXpForTier(tier: number): number {
  return HERO_GATHERING_XP_BY_TIER[tier as keyof typeof HERO_GATHERING_XP_BY_TIER] ?? 1;
}

export function getWorkerGatheringXpForTier(tier: number): number {
  return WORKER_GATHERING_XP_BY_TIER[tier as keyof typeof WORKER_GATHERING_XP_BY_TIER] ?? 1;
}

export function getHeroGatheringXpFromWorkerForTier(tier: number): number {
  return HERO_GATHERING_XP_FROM_WORKER_BY_TIER[tier as keyof typeof HERO_GATHERING_XP_FROM_WORKER_BY_TIER] ?? 1;
}

export function getRequiredGatheringMasteryForTier(tier: number): number {
  if (import.meta.env.DEV && typeof window !== "undefined") {
    const params = new URLSearchParams(window.location.search);
    if (params.get("productionTest") === "1" || params.get("devTest") === "1") {
      return 0;
    }
  }
  return GATHERING_MASTERY_UNLOCK_BY_TIER[tier as keyof typeof GATHERING_MASTERY_UNLOCK_BY_TIER] ?? 0;
}

/**
 * Each progression domain authors its own definitions; this catalog only
 * composes them for the generic MasteryService.
 */
export const MASTERY_DEFINITIONS = [
  ...WEAPON_MASTERY_DEFINITIONS,
  ...GATHERING_MASTERY_DEFINITIONS,
  ...FACTION_MASTERY_DEFINITIONS,
];

export function getMasteryDisplayName(masteryId: string): string {
  return getWeaponMasteryDisplayName(masteryId)
    ?? getGatheringMasteryDisplayName(masteryId)
    ?? getFactionMasteryDisplayName(masteryId)
    ?? masteryId;
}

export const DESTINY_NODES = [
  {
    id: asDestinyNodeId("node_sword_1"),
    displayName: "Initié à l'épée",
    category: "weapon",
    prerequisites: [] as ReturnType<typeof asDestinyNodeId>[],
    requirements: [{
      type: "mastery_level" as const,
      masteryId: asMasteryId("mastery_sword"),
      level: 1,
    }],
    rewards: [{ type: "equipment_tier_unlock" as const, tier: 2 }],
  },
  {
    id: asDestinyNodeId("node_sword_2"),
    displayName: "Adepte de l'épée",
    category: "weapon",
    prerequisites: [asDestinyNodeId("node_sword_1")],
    requirements: [{
      type: "mastery_level" as const,
      masteryId: asMasteryId("mastery_sword"),
      level: 3,
    }],
    rewards: [{ type: "equipment_tier_unlock" as const, tier: 3 }],
  },
];

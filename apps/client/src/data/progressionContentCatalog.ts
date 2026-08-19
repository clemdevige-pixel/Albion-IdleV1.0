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

export const GATHERING_MASTERY_UNLOCK_BY_TIER = {
  3: 0,
  4: 3,
  5: 7,
  6: 10,
  7: 15,
  8: 23,
} as const;

export function getRequiredGatheringMasteryForTier(tier: number): number {
  if (
    import.meta.env.DEV
    && typeof window !== "undefined"
    && new URLSearchParams(window.location.search).get("productionTest") === "1"
  ) {
    return 0;
  }
  return GATHERING_MASTERY_UNLOCK_BY_TIER[tier as keyof typeof GATHERING_MASTERY_UNLOCK_BY_TIER] ?? 0;
}

/**
 * Weapon mastery definitions are authored by weaponContentCatalog.
 * This catalog only composes weapon and non-weapon progression domains.
 */
export const MASTERY_DEFINITIONS = [
  ...WEAPON_MASTERY_DEFINITIONS,
  ...GATHERING_MASTERY_DEFINITIONS,
];

export function getMasteryDisplayName(masteryId: string): string {
  return getWeaponMasteryDisplayName(masteryId)
    ?? getGatheringMasteryDisplayName(masteryId)
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

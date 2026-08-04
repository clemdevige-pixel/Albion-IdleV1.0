export const WEAPON_MASTERY_XP = [
  100, 200, 300, 450, 650, 900, 1200, 1600, 2100, 2700,
];

export const GATHERING_MASTERY_XP = [
  50, 100, 175, 275, 400, 550, 750, 1000, 1300, 1700,
];

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

export function getRequiredGatheringMasteryForTier(
  tier: number,
  unlockAllForTechnicalTest: boolean,
): number {
  if (unlockAllForTechnicalTest) return 0;
  return Math.max(0, tier - 3) * 3;
}

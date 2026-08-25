export const ADVANCED_WORKER_ORGANIZATION = {
  workerCapacity: 8,
  professionCapacity: 2,
  recruitmentCost: 5_000,
} as const;

export const WORKER_MASTERY_MAX_LEVEL = 100;
export const WORKER_MASTERY_XP_QUADRATIC_FACTOR = 100;
export const WORKER_MASTERY_SPEED_PERCENT_PER_LEVEL = 0.5;

export const WORKER_DEFINITION_ID_VALUES = {
  woodcutter: "worker_woodcutter_t3",
  miner: "worker_miner_t3",
  skinner: "worker_skinner_t3",
  fiberHarvester: "worker_fiber_harvester_t3",
} as const;

export const WORKER_TASK_ID_VALUES = {
  wood: "worker_gather_wood_t3",
  ore: "worker_gather_copper_t3",
  hide: "worker_gather_hide_t3",
  fiber: "worker_gather_fiber_t3",
} as const;

export interface AuthoredWorkerDefinition {
  readonly id: string;
  readonly displayName: string;
  readonly displayNames: readonly string[];
  readonly profession: "woodcutter" | "miner" | "skinner" | "fiber_harvester";
  readonly baseMasteryGainRate: number;
  readonly tags: readonly string[];
}

export interface AuthoredWorkerTaskDefinition {
  readonly id: string;
  readonly displayName: string;
  readonly category: "gathering";
  readonly requiredProfession: AuthoredWorkerDefinition["profession"];
  readonly durationTicks: number;
  readonly baseYield: number;
  readonly resourceTier: number;
  readonly tags: readonly string[];
}

export const AUTHORED_WORKER_DEFINITIONS = [
  { id: WORKER_DEFINITION_ID_VALUES.woodcutter, displayName: "Edda", displayNames: ["Edda", "Toren"], profession: "woodcutter", baseMasteryGainRate: 1, tags: ["gathering", "wood"] },
  { id: WORKER_DEFINITION_ID_VALUES.miner, displayName: "Borin", displayNames: ["Borin", "Dagr"], profession: "miner", baseMasteryGainRate: 1, tags: ["gathering", "ore"] },
  { id: WORKER_DEFINITION_ID_VALUES.skinner, displayName: "Mira", displayNames: ["Mira", "Sela"], profession: "skinner", baseMasteryGainRate: 1, tags: ["gathering", "hide"] },
  { id: WORKER_DEFINITION_ID_VALUES.fiberHarvester, displayName: "Lina", displayNames: ["Lina", "Neris"], profession: "fiber_harvester", baseMasteryGainRate: 1, tags: ["gathering", "fiber"] },
] as const satisfies readonly AuthoredWorkerDefinition[];

export const AUTHORED_WORKER_TASK_DEFINITIONS = [
  { id: WORKER_TASK_ID_VALUES.wood, displayName: "Récolter du bois de bouleau", category: "gathering", requiredProfession: "woodcutter", durationTicks: 60, baseYield: 1, resourceTier: 3, tags: ["wood", "birch"] },
  { id: WORKER_TASK_ID_VALUES.ore, displayName: "Extraire du minerai de cuivre", category: "gathering", requiredProfession: "miner", durationTicks: 60, baseYield: 1, resourceTier: 3, tags: ["ore", "copper"] },
  { id: WORKER_TASK_ID_VALUES.hide, displayName: "Dépecer des peaux robustes", category: "gathering", requiredProfession: "skinner", durationTicks: 60, baseYield: 1, resourceTier: 3, tags: ["hide", "leather"] },
  { id: WORKER_TASK_ID_VALUES.fiber, displayName: "Récolter des fibres de lin", category: "gathering", requiredProfession: "fiber_harvester", durationTicks: 60, baseYield: 1, resourceTier: 3, tags: ["fiber", "cloth"] },
] as const satisfies readonly AuthoredWorkerTaskDefinition[];

export function getWorkerMasteryLevelFromXp(masteryXp: number): number {
  return Math.min(
    WORKER_MASTERY_MAX_LEVEL,
    Math.floor(Math.sqrt(Math.max(0, masteryXp) / WORKER_MASTERY_XP_QUADRATIC_FACTOR)),
  );
}

export function getWorkerMasteryXpThreshold(level: number): number {
  return Math.max(0, level) ** 2 * WORKER_MASTERY_XP_QUADRATIC_FACTOR;
}

export function getWorkerMasterySpeedMultiplier(level: number): number {
  const clampedLevel = Math.max(0, Math.min(WORKER_MASTERY_MAX_LEVEL, Math.floor(level)));
  return 1 + clampedLevel * (WORKER_MASTERY_SPEED_PERCENT_PER_LEVEL / 100);
}

import {
  asWorkerDefinitionId,
  asWorkerTaskDefinitionId,
  type WorkerDefinition,
  type WorkerTaskDefinition,
} from "@game/gameplay";

export const WORKER_DEFINITION_IDS = {
  woodcutter: asWorkerDefinitionId("worker_woodcutter_t3"),
  miner: asWorkerDefinitionId("worker_miner_t3"),
  skinner: asWorkerDefinitionId("worker_skinner_t3"),
  fiberHarvester: asWorkerDefinitionId("worker_fiber_harvester_t3"),
} as const;

export const WORKER_TASK_IDS = {
  wood: asWorkerTaskDefinitionId("worker_gather_wood_t3"),
  ore: asWorkerTaskDefinitionId("worker_gather_copper_t3"),
  hide: asWorkerTaskDefinitionId("worker_gather_hide_t3"),
  fiber: asWorkerTaskDefinitionId("worker_gather_fiber_t3"),
} as const;

/**
 * Authored post-Research worker roster rules.
 * Baseline capacity/recruitment remain owned by the Island worker-house config.
 */
export const ADVANCED_WORKER_ORGANIZATION = {
  workerCapacity: 8,
  professionCapacity: 2,
  recruitmentCost: 5_000,
} as const;

export const WORKER_DEFINITIONS: readonly WorkerDefinition[] = [
  {
    id: WORKER_DEFINITION_IDS.woodcutter,
    displayName: "Edda",
    displayNames: ["Edda", "Toren"],
    profession: "woodcutter",
    baseMasteryGainRate: 1,
    tags: ["gathering", "wood"],
  },
  {
    id: WORKER_DEFINITION_IDS.miner,
    displayName: "Borin",
    displayNames: ["Borin", "Dagr"],
    profession: "miner",
    baseMasteryGainRate: 1,
    tags: ["gathering", "ore"],
  },
  {
    id: WORKER_DEFINITION_IDS.skinner,
    displayName: "Mira",
    displayNames: ["Mira", "Sela"],
    profession: "skinner",
    baseMasteryGainRate: 1,
    tags: ["gathering", "hide"],
  },
  {
    id: WORKER_DEFINITION_IDS.fiberHarvester,
    displayName: "Lina",
    displayNames: ["Lina", "Neris"],
    profession: "fiber_harvester",
    baseMasteryGainRate: 1,
    tags: ["gathering", "fiber"],
  },
];

export const WORKER_TASK_DEFINITIONS: readonly WorkerTaskDefinition[] = [
  { id: WORKER_TASK_IDS.wood, displayName: "Récolter du bois de bouleau", category: "gathering", requiredProfession: "woodcutter", durationTicks: 60, baseYield: 1, resourceTier: 3, tags: ["wood", "birch"] },
  { id: WORKER_TASK_IDS.ore, displayName: "Extraire du minerai de cuivre", category: "gathering", requiredProfession: "miner", durationTicks: 60, baseYield: 1, resourceTier: 3, tags: ["ore", "copper"] },
  { id: WORKER_TASK_IDS.hide, displayName: "Dépecer des peaux robustes", category: "gathering", requiredProfession: "skinner", durationTicks: 60, baseYield: 1, resourceTier: 3, tags: ["hide", "leather"] },
  { id: WORKER_TASK_IDS.fiber, displayName: "Récolter des fibres de lin", category: "gathering", requiredProfession: "fiber_harvester", durationTicks: 60, baseYield: 1, resourceTier: 3, tags: ["fiber", "cloth"] },
];

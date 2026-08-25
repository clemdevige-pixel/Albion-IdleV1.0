import {
  AUTHORED_WORKER_DEFINITIONS,
  AUTHORED_WORKER_TASK_DEFINITIONS,
  WORKER_DEFINITION_ID_VALUES,
  WORKER_TASK_ID_VALUES,
} from "@game/data";
import {
  asWorkerDefinitionId,
  asWorkerTaskDefinitionId,
  type WorkerDefinition,
  type WorkerTaskDefinition,
} from "@game/gameplay";

export { ADVANCED_WORKER_ORGANIZATION } from "@game/data";

export const WORKER_DEFINITION_IDS = {
  woodcutter: asWorkerDefinitionId(WORKER_DEFINITION_ID_VALUES.woodcutter),
  miner: asWorkerDefinitionId(WORKER_DEFINITION_ID_VALUES.miner),
  skinner: asWorkerDefinitionId(WORKER_DEFINITION_ID_VALUES.skinner),
  fiberHarvester: asWorkerDefinitionId(WORKER_DEFINITION_ID_VALUES.fiberHarvester),
} as const;

export const WORKER_TASK_IDS = {
  wood: asWorkerTaskDefinitionId(WORKER_TASK_ID_VALUES.wood),
  ore: asWorkerTaskDefinitionId(WORKER_TASK_ID_VALUES.ore),
  hide: asWorkerTaskDefinitionId(WORKER_TASK_ID_VALUES.hide),
  fiber: asWorkerTaskDefinitionId(WORKER_TASK_ID_VALUES.fiber),
} as const;

export const WORKER_DEFINITIONS: readonly WorkerDefinition[] = AUTHORED_WORKER_DEFINITIONS.map(
  (definition) => ({
    ...definition,
    id: asWorkerDefinitionId(definition.id),
    displayNames: [...definition.displayNames],
    tags: [...definition.tags],
  }),
);

export const WORKER_TASK_DEFINITIONS: readonly WorkerTaskDefinition[] = AUTHORED_WORKER_TASK_DEFINITIONS.map(
  (definition) => ({
    ...definition,
    id: asWorkerTaskDefinitionId(definition.id),
    tags: [...definition.tags],
  }),
);

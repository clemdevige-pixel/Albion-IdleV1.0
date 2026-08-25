import {
  ADVANCED_WORKER_ORGANIZATION,
  AUTHORED_WORKER_DEFINITIONS,
  AUTHORED_WORKER_TASK_DEFINITIONS,
} from "@game/data";
import {
  asWorkerDefinitionId,
  asWorkerTaskDefinitionId,
  type WorkerDefinition,
  type WorkerTaskDefinition,
} from "@game/gameplay";

export { ADVANCED_WORKER_ORGANIZATION } from "@game/data";

export const WORKER_DEFINITION_IDS = {
  woodcutter: asWorkerDefinitionId(AUTHORED_WORKER_DEFINITIONS[0].id),
  miner: asWorkerDefinitionId(AUTHORED_WORKER_DEFINITIONS[1].id),
  skinner: asWorkerDefinitionId(AUTHORED_WORKER_DEFINITIONS[2].id),
  fiberHarvester: asWorkerDefinitionId(AUTHORED_WORKER_DEFINITIONS[3].id),
} as const;

export const WORKER_TASK_IDS = {
  wood: asWorkerTaskDefinitionId(AUTHORED_WORKER_TASK_DEFINITIONS[0].id),
  ore: asWorkerTaskDefinitionId(AUTHORED_WORKER_TASK_DEFINITIONS[1].id),
  hide: asWorkerTaskDefinitionId(AUTHORED_WORKER_TASK_DEFINITIONS[2].id),
  fiber: asWorkerTaskDefinitionId(AUTHORED_WORKER_TASK_DEFINITIONS[3].id),
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

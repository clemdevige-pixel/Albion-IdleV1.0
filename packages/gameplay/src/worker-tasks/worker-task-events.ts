import type { WorkerTaskDefinition, WorkerAssignment } from "./worker-task-types.js";
import type { WorkerId } from "../workers/index.js";
import type { WorkerTaskDefinitionId } from "./worker-task-types.js";

export interface WorkerTaskEventMap {
  "task:registered": { readonly definition: WorkerTaskDefinition };
  "assignment:created": { readonly assignment: WorkerAssignment };
  "assignment:removed": {
    readonly workerId: WorkerId;
    readonly taskDefinitionId: WorkerTaskDefinitionId;
  };
  "assignment:changed": {
    readonly workerId: WorkerId;
    readonly previousTaskDefinitionId: WorkerTaskDefinitionId;
    readonly newTaskDefinitionId: WorkerTaskDefinitionId;
  };
}

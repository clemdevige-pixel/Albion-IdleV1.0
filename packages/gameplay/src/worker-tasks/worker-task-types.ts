import type { Brand } from "@game/core";
import type { WorkerId, WorkerProfession } from "../workers/index.js";

/** Unique runtime id for a task definition. */
export type WorkerTaskDefinitionId = Brand<string, "WorkerTaskDefinitionId">;
export function asWorkerTaskDefinitionId(raw: string): WorkerTaskDefinitionId {
  return raw as WorkerTaskDefinitionId;
}

/** Unique runtime id for a worker task instance / assignment slot. */
export type WorkerTaskId = Brand<string, "WorkerTaskId">;
export function asWorkerTaskId(raw: string): WorkerTaskId {
  return raw as WorkerTaskId;
}

/** High-level grouping for worker tasks. */
export type WorkerTaskCategory =
  | "gathering"
  | "crafting"
  | "refining"
  | "building"
  | "logistics";

/** Static definition of a task that workers can be assigned to. */
export interface WorkerTaskDefinition {
  readonly id: WorkerTaskDefinitionId;
  readonly displayName: string;
  readonly category: WorkerTaskCategory;
  readonly requiredProfession: WorkerProfession;
  readonly durationTicks: number;
  readonly baseYield: number;
  readonly resourceTier: number;
  readonly tags: readonly string[];
}

/** Lifecycle states for an assignment. */
export type WorkerAssignmentState =
  | "pending"
  | "active"
  | "completed"
  | "cancelled";

/** Binds a worker to a task definition. */
export interface WorkerAssignment {
  readonly workerId: WorkerId;
  readonly taskDefinitionId: WorkerTaskDefinitionId;
  readonly assignedAt: number;
  readonly state: WorkerAssignmentState;
}

import type { WorkerInstance, WorkerId, WorkerProfession, WorkerState } from "../workers/index.js";
import type { WorkerAssignment, WorkerTaskDefinitionId, WorkerAssignmentState } from "../worker-tasks/index.js";
import type { AutomationState, AutomationId } from "../worker-automation/index.js";

// ---------------------------------------------------------------------------
// Serializable state types
// ---------------------------------------------------------------------------

export interface WorkerSaveData {
  readonly id: string;
  readonly definitionId: string;
  readonly profession: WorkerProfession;
  readonly displayName: string;
  readonly mastery: number;
  readonly state: WorkerState;
  readonly assignedBuildingId: string | undefined;
  readonly productivityModifiers: Record<string, number>;
}

export interface AssignmentSaveData {
  readonly workerId: string;
  readonly taskDefinitionId: string;
  readonly assignedAt: number;
  readonly state: WorkerAssignmentState;
}

export interface AutomationSaveData {
  readonly id: string;
  readonly workerId: string;
  readonly loopMode: boolean;
  readonly state: AutomationState;
  readonly currentIndex: number;
  readonly remainingRepeats: number;
  readonly queue: readonly { readonly taskDefId: string; readonly repeatCount: number }[];
}

export interface WorkerSaveState {
  readonly workers: readonly WorkerSaveData[];
  readonly assignments: readonly AssignmentSaveData[];
  readonly automations: readonly AutomationSaveData[];
}

// ---------------------------------------------------------------------------
// Serialize
// ---------------------------------------------------------------------------

export function serializeWorkerState(
  workers: readonly WorkerInstance[],
  assignments: readonly WorkerAssignment[],
  automations: readonly {
    readonly instance: { readonly id: AutomationId; readonly workerId: WorkerId; readonly loopMode: boolean; readonly state: AutomationState; readonly currentIndex: number; readonly remainingRepeats: number };
    readonly queue: readonly { readonly taskDefId: WorkerTaskDefinitionId; readonly repeatCount: number }[];
  }[],
): WorkerSaveState {
  return {
    workers: workers.map((w) => ({
      id: w.id,
      definitionId: w.definitionId,
      profession: w.profession,
      displayName: w.displayName,
      mastery: w.mastery,
      state: w.state,
      assignedBuildingId: w.assignedBuildingId,
      productivityModifiers: { ...w.productivityModifiers },
    })),
    assignments: assignments.map((a) => ({
      workerId: a.workerId,
      taskDefinitionId: a.taskDefinitionId,
      assignedAt: a.assignedAt,
      state: a.state,
    })),
    automations: automations.map((auto) => ({
      id: auto.instance.id,
      workerId: auto.instance.workerId,
      loopMode: auto.instance.loopMode,
      state: auto.instance.state,
      currentIndex: auto.instance.currentIndex,
      remainingRepeats: auto.instance.remainingRepeats,
      queue: auto.queue.map((q) => ({
        taskDefId: q.taskDefId,
        repeatCount: q.repeatCount,
      })),
    })),
  };
}

// ---------------------------------------------------------------------------
// Deserialize
// ---------------------------------------------------------------------------

export interface DeserializedWorkerState {
  readonly workers: readonly WorkerSaveData[];
  readonly assignments: readonly AssignmentSaveData[];
  readonly automations: readonly AutomationSaveData[];
}

export function deserializeWorkerState(json: string): DeserializedWorkerState {
  const raw = JSON.parse(json) as WorkerSaveState;
  return {
    workers: raw.workers,
    assignments: raw.assignments,
    automations: raw.automations,
  };
}

import type { WorkerId, WorkerState } from "./worker-types.js";

export interface WorkerCreatedEvent {
  readonly workerId: WorkerId;
  readonly definitionId: string;
  readonly displayName: string;
}

export interface WorkerRemovedEvent {
  readonly workerId: WorkerId;
}

export interface WorkerStateChangedEvent {
  readonly workerId: WorkerId;
  readonly previousState: WorkerState;
  readonly newState: WorkerState;
}

export interface WorkerMasteryGainedEvent {
  readonly workerId: WorkerId;
  readonly amount: number;
  readonly newMastery: number;
}

export interface WorkerEventMap {
  readonly "worker:created": WorkerCreatedEvent;
  readonly "worker:removed": WorkerRemovedEvent;
  readonly "worker:stateChanged": WorkerStateChangedEvent;
  readonly "worker:masteryGained": WorkerMasteryGainedEvent;
}

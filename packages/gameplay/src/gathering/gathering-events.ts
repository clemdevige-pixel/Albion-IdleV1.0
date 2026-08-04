import type { GatheringResult, GatheringSessionId } from "./gathering-types.js";
import type { ResourceNodeId } from "../resource-nodes/resource-node-types.js";

export interface GatherStartedEvent {
  readonly sessionId: GatheringSessionId;
  readonly nodeId: ResourceNodeId;
}

export interface GatherCompletedEvent {
  readonly sessionId: GatheringSessionId;
  readonly nodeId: ResourceNodeId;
  readonly result: GatheringResult;
}

export interface GatherInterruptedEvent {
  readonly sessionId: GatheringSessionId;
  readonly nodeId: ResourceNodeId;
}

export interface GatherFailedEvent {
  readonly nodeId: ResourceNodeId;
  readonly reason: string;
}

export interface GatheringEventMap {
  readonly gatherStarted: GatherStartedEvent;
  readonly gatherCompleted: GatherCompletedEvent;
  readonly gatherInterrupted: GatherInterruptedEvent;
  readonly gatherFailed: GatherFailedEvent;
}

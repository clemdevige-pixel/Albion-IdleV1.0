import type { Brand } from "@game/core";
import type { WorkerId } from "../workers/index.js";
import type { WorkerTaskDefinitionId } from "../worker-tasks/index.js";

export type AutomationId = Brand<string, "AutomationId">;

let automationCounter = 0;

export function asAutomationId(raw: string): AutomationId {
  return raw as AutomationId;
}

export function nextAutomationId(): AutomationId {
  return `automation_${++automationCounter}` as AutomationId;
}

export function _resetAutomationCounter(): void {
  automationCounter = 0;
}

export type AutomationState = "idle" | "running" | "paused" | "stopped";

export interface AutomationQueueEntry {
  readonly taskDefId: WorkerTaskDefinitionId;
  readonly repeatCount: number;
}

export interface AutomationConfig {
  readonly workerId: WorkerId;
  readonly queue: readonly AutomationQueueEntry[];
  readonly loopMode: boolean;
}

export interface AutomationInstance {
  readonly id: AutomationId;
  readonly workerId: WorkerId;
  readonly loopMode: boolean;
  state: AutomationState;
  currentIndex: number;
  remainingRepeats: number;
}

import type { Brand } from "@game/core";
import type { WorkerId } from "../workers/index.js";
import type { WorkerTaskDefinitionId } from "../worker-tasks/index.js";

// ---------------------------------------------------------------------------
// Branded identifiers
// ---------------------------------------------------------------------------

export type WorkerSessionId = Brand<string, "WorkerSessionId">;

export function asWorkerSessionId(raw: string): WorkerSessionId {
  return raw as WorkerSessionId;
}

// ---------------------------------------------------------------------------
// Execution state
// ---------------------------------------------------------------------------

export type WorkerExecutionState =
  | "idle"
  | "executing"
  | "paused"
  | "completed"
  | "interrupted"
  | "failed";

// ---------------------------------------------------------------------------
// Execution result
// ---------------------------------------------------------------------------

export type WorkerExecutionResult =
  | {
      readonly ok: true;
      readonly workerId: WorkerId;
      readonly taskDefId: WorkerTaskDefinitionId;
      readonly yield: number;
      readonly masteryGained: number;
    }
  | { readonly ok: false; readonly reason: string };

// ---------------------------------------------------------------------------
// Session config
// ---------------------------------------------------------------------------

export interface WorkerSessionConfig {
  readonly baseDurationTicks: number;
  readonly speedModifier: number;
  readonly yieldModifier: number;
}

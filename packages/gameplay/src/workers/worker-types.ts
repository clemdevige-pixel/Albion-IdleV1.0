import type { Brand } from "@game/core";

// ---------------------------------------------------------------------------
// Branded identifiers
// ---------------------------------------------------------------------------

export type WorkerId = Brand<string, "WorkerId">;

export function asWorkerId(s: string): WorkerId {
  return s as WorkerId;
}

export type WorkerDefinitionId = Brand<string, "WorkerDefinitionId">;

export function asWorkerDefinitionId(s: string): WorkerDefinitionId {
  return s as WorkerDefinitionId;
}

// ---------------------------------------------------------------------------
// Enums
// ---------------------------------------------------------------------------

export type WorkerProfession =
  | "woodcutter"
  | "stonecutter"
  | "miner"
  | "fiber_harvester"
  | "skinner";

export type WorkerState = "idle" | "assigned" | "working" | "inactive";

// ---------------------------------------------------------------------------
// Definition & Instance
// ---------------------------------------------------------------------------

export interface WorkerDefinition {
  readonly id: WorkerDefinitionId;
  readonly displayName: string;
  /** Optional authored names used in order for multiple instances of the same definition. */
  readonly displayNames?: readonly string[];
  readonly profession: WorkerProfession;
  readonly baseMasteryGainRate: number;
  readonly tags: readonly string[];
}

export interface WorkerInstance {
  readonly id: WorkerId;
  readonly definitionId: WorkerDefinitionId;
  readonly profession: WorkerProfession;
  displayName: string;
  mastery: number;
  state: WorkerState;
  assignedBuildingId: string | undefined;
  productivityModifiers: Record<string, number>;
}

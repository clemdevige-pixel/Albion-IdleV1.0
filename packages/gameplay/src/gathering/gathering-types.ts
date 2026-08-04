import type { Brand } from "@game/core";
import type { ResourceFamily } from "../resources/resource-types.js";
import type { ResourceNodeId } from "../resource-nodes/resource-node-types.js";

// ---------------------------------------------------------------------------
// Branded identifiers
// ---------------------------------------------------------------------------

export type GatheringSessionId = Brand<string, "GatheringSessionId">;

export function asGatheringSessionId(s: string): GatheringSessionId {
  return s as GatheringSessionId;
}

// ---------------------------------------------------------------------------
// Gathering state
// ---------------------------------------------------------------------------

export type GatheringState = "idle" | "gathering" | "completed" | "interrupted";

// ---------------------------------------------------------------------------
// Request / Result / Config
// ---------------------------------------------------------------------------

export interface GatheringRequest {
  readonly nodeId: ResourceNodeId;
  readonly currentTick: number;
}

export interface GatheringResult {
  readonly resourceFamily: ResourceFamily;
  readonly resourceTier: number;
  readonly quantityGathered: number;
  readonly nodeExhausted: boolean;
}

export interface GatheringSessionConfig {
  readonly baseGatherTimeTicks: number;
  readonly toolModifier: number;
  readonly masteryModifier: number;
}

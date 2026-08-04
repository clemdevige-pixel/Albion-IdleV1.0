import type { Brand } from "@game/core";
import type { ResourceFamily } from "../resources/resource-types.js";

// ---------------------------------------------------------------------------
// Branded identifier
// ---------------------------------------------------------------------------

export type GatheringToolId = Brand<string, "GatheringToolId">;

export function asGatheringToolId(s: string): GatheringToolId {
  return s as GatheringToolId;
}

// ---------------------------------------------------------------------------
// Tool type
// ---------------------------------------------------------------------------

export type GatheringToolType =
  | "axe"
  | "hammer"
  | "pickaxe"
  | "sickle"
  | "skinning_knife";

// ---------------------------------------------------------------------------
// Tool definition
// ---------------------------------------------------------------------------

export interface GatheringToolDefinition {
  readonly id: GatheringToolId;
  readonly name: string;
  readonly toolType: GatheringToolType;
  readonly tier: number;
  readonly speedModifier: number;
  readonly yieldModifier: number;
  readonly tags: readonly string[];
}

// ---------------------------------------------------------------------------
// Family → tool type mapping
// ---------------------------------------------------------------------------

export const TOOL_FAMILY_MAP: Readonly<Record<ResourceFamily, GatheringToolType>> = {
  Wood: "axe",
  Stone: "hammer",
  Ore: "pickaxe",
  Fiber: "sickle",
  Hide: "skinning_knife",
} as const;

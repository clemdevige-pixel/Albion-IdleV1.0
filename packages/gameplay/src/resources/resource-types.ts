import type { Brand } from "@game/core";

// ---------------------------------------------------------------------------
// Branded identifiers
// ---------------------------------------------------------------------------

export type ResourceId = Brand<string, "ResourceId">;

export function asResourceId(s: string): ResourceId {
  return s as ResourceId;
}

export type ResourceDefinitionId = Brand<string, "ResourceDefinitionId">;

export function asResourceDefinitionId(s: string): ResourceDefinitionId {
  return s as ResourceDefinitionId;
}

// ---------------------------------------------------------------------------
// Resource family
// ---------------------------------------------------------------------------

export type ResourceFamily = "Wood" | "Stone" | "Ore" | "Fiber" | "Hide";

// ---------------------------------------------------------------------------
// Resource Definition — immutable data description
// ---------------------------------------------------------------------------

export interface ResourceDefinition {
  readonly id: ResourceDefinitionId;
  readonly name: string;
  readonly family: ResourceFamily;
  readonly tier: number;
  readonly maxCharges: number;
  readonly respawnDurationTicks: number;
  readonly baseYield: number;
  readonly tags: readonly string[];
}

// ---------------------------------------------------------------------------
// Resource Instance — runtime state
// ---------------------------------------------------------------------------

export type ResourceState = "available" | "depleted" | "respawning" | "destroyed";

export interface ResourceInstance {
  readonly id: ResourceId;
  readonly definitionId: ResourceDefinitionId;
  readonly state: ResourceState;
  readonly currentCharges: number;
  readonly maxCharges: number;
  readonly tier: number;
  readonly family: ResourceFamily;
}

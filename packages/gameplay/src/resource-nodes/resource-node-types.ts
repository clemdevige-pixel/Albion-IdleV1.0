import type { Brand } from "@game/core";
import type { ResourceDefinitionId, ResourceId } from "../resources/resource-types.js";
import type { ZoneDefinitionId } from "../zones/zone-types.js";

// ---------------------------------------------------------------------------
// Branded identifiers
// ---------------------------------------------------------------------------

export type ResourceNodeId = Brand<string, "ResourceNodeId">;

export function asResourceNodeId(s: string): ResourceNodeId {
  return s as ResourceNodeId;
}

export type ResourceNodeDefinitionId = Brand<string, "ResourceNodeDefinitionId">;

export function asResourceNodeDefinitionId(s: string): ResourceNodeDefinitionId {
  return s as ResourceNodeDefinitionId;
}

// ---------------------------------------------------------------------------
// Resource Node State
// ---------------------------------------------------------------------------

export type ResourceNodeState = "active" | "exhausted" | "disabled";

// ---------------------------------------------------------------------------
// Resource Node Definition — immutable data description
// ---------------------------------------------------------------------------

export interface ResourceNodeDefinition {
  readonly id: ResourceNodeDefinitionId;
  readonly name: string;
  readonly resourceDefinitionId: ResourceDefinitionId;
  readonly requiredToolTier: number;
  readonly tags: readonly string[];
}

// ---------------------------------------------------------------------------
// Resource Node Instance — runtime state
// ---------------------------------------------------------------------------

export interface ResourceNodeInstance {
  readonly id: ResourceNodeId;
  readonly definitionId: ResourceNodeDefinitionId;
  readonly zoneDefId: ZoneDefinitionId;
  readonly resourceId: ResourceId;
  readonly state: ResourceNodeState;
}

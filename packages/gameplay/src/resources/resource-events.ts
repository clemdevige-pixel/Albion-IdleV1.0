import type { ResourceDefinitionId, ResourceFamily, ResourceId, ResourceState } from "./resource-types.js";

// ---------------------------------------------------------------------------
// Event payloads
// ---------------------------------------------------------------------------

export interface ResourceCreatedEvent {
  readonly resourceId: ResourceId;
  readonly definitionId: ResourceDefinitionId;
  readonly family: ResourceFamily;
  readonly tier: number;
}

export interface ResourceHarvestedEvent {
  readonly resourceId: ResourceId;
  readonly definitionId: ResourceDefinitionId;
  readonly currentCharges: number;
  readonly maxCharges: number;
}

export interface ResourceDepletedEvent {
  readonly resourceId: ResourceId;
  readonly definitionId: ResourceDefinitionId;
}

export interface ResourceRestoredEvent {
  readonly resourceId: ResourceId;
  readonly definitionId: ResourceDefinitionId;
}

export interface ResourceDestroyedEvent {
  readonly resourceId: ResourceId;
  readonly definitionId: ResourceDefinitionId;
}

export interface ResourceStateChangedEvent {
  readonly resourceId: ResourceId;
  readonly previousState: ResourceState;
  readonly newState: ResourceState;
}

// ---------------------------------------------------------------------------
// Event map
// ---------------------------------------------------------------------------

export interface ResourceEventMap {
  resourceCreated: ResourceCreatedEvent;
  resourceHarvested: ResourceHarvestedEvent;
  resourceDepleted: ResourceDepletedEvent;
  resourceRestored: ResourceRestoredEvent;
  resourceDestroyed: ResourceDestroyedEvent;
  resourceStateChanged: ResourceStateChangedEvent;
}

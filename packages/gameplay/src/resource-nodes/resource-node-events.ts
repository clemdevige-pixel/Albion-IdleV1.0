import type { ResourceNodeDefinitionId, ResourceNodeId, ResourceNodeState } from "./resource-node-types.js";

// ---------------------------------------------------------------------------
// Event payloads
// ---------------------------------------------------------------------------

export interface NodeCreatedEvent {
  readonly nodeId: ResourceNodeId;
  readonly definitionId: ResourceNodeDefinitionId;
}

export interface NodeExhaustedEvent {
  readonly nodeId: ResourceNodeId;
  readonly definitionId: ResourceNodeDefinitionId;
}

export interface NodeReactivatedEvent {
  readonly nodeId: ResourceNodeId;
  readonly definitionId: ResourceNodeDefinitionId;
}

export interface NodeDisabledEvent {
  readonly nodeId: ResourceNodeId;
  readonly definitionId: ResourceNodeDefinitionId;
}

export interface NodeDestroyedEvent {
  readonly nodeId: ResourceNodeId;
  readonly definitionId: ResourceNodeDefinitionId;
}

export interface NodeStateChangedEvent {
  readonly nodeId: ResourceNodeId;
  readonly previousState: ResourceNodeState;
  readonly newState: ResourceNodeState;
}

// ---------------------------------------------------------------------------
// Event map
// ---------------------------------------------------------------------------

export interface ResourceNodeEventMap {
  nodeCreated: NodeCreatedEvent;
  nodeExhausted: NodeExhaustedEvent;
  nodeReactivated: NodeReactivatedEvent;
  nodeDisabled: NodeDisabledEvent;
  nodeDestroyed: NodeDestroyedEvent;
  nodeStateChanged: NodeStateChangedEvent;
}

export type {
  ResourceId,
  ResourceDefinitionId,
  ResourceFamily,
  ResourceDefinition,
  ResourceState,
  ResourceInstance,
} from "./resource-types.js";
export { asResourceId, asResourceDefinitionId } from "./resource-types.js";

export type {
  ResourceEventMap,
  ResourceCreatedEvent,
  ResourceHarvestedEvent,
  ResourceDepletedEvent,
  ResourceRestoredEvent,
  ResourceDestroyedEvent,
  ResourceStateChangedEvent,
} from "./resource-events.js";

export { ResourceRegistry } from "./resource-registry.js";

export { createResource, _resetResourceCounter } from "./resource-factory.js";

export { ResourceRuntime } from "./resource-runtime.js";

export { canTransition as canResourceTransition } from "./resource-lifecycle.js";

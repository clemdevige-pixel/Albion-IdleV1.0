import type { GatheringToolDefinition, GatheringToolType } from "./gathering-tool-types.js";
import type { ResourceFamily } from "../resources/resource-types.js";

export interface ToolValidatedEvent {
  readonly tool: GatheringToolDefinition;
  readonly resourceFamily: ResourceFamily;
  readonly requiredTier: number;
}

export interface ToolValidationFailedEvent {
  readonly tool: GatheringToolDefinition | undefined;
  readonly resourceFamily: ResourceFamily;
  readonly requiredTier: number;
  readonly requiredToolType: GatheringToolType;
  readonly reason: string;
}

export interface GatheringToolEventMap {
  readonly toolValidated: ToolValidatedEvent;
  readonly toolValidationFailed: ToolValidationFailedEvent;
}

export type {
  ZoneId,
  ZoneDefinitionId,
  ZoneMonsterSpawn,
  ZoneDefinition,
  ZoneStatus,
  ZoneInstance,
  ZoneTransitionDeniedReason,
  ZoneTransitionResult,
} from "./zone-types.js";
export { asZoneId, asZoneDefinitionId } from "./zone-types.js";

export type {
  ZoneEventMap,
  ZoneLoadedEvent,
  ZoneUnloadedEvent,
  ZoneActivatedEvent,
  ZoneDeactivatedEvent,
  ZoneChangedEvent,
  ZoneDefinitionRegisteredEvent,
} from "./zone-events.js";

export { ZoneRegistry } from "./zone-registry.js";

export { ZoneManager, _resetZoneCounter } from "./zone-manager.js";

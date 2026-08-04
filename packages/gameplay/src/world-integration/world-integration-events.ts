import type { WorldZoneChangedEvent } from "./world-integration-types.js";

export interface WorldIntegrationEventMap {
  worldZoneChanged: WorldZoneChangedEvent;
  worldInitialized: undefined;
  worldStateLoaded: undefined;
  worldCleared: undefined;
}

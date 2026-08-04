import type { ZoneDiscoveryRecord } from "./exploration-types.js";

export interface ExplorationEventMap {
  readonly zoneDiscovered: ZoneDiscoveryRecord;
  readonly zoneRevisited: ZoneDiscoveryRecord;
  readonly explorationStateChanged: undefined;
}

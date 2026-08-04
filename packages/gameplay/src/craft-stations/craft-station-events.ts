import type { CraftStationDefinition, CraftStationId } from "./craft-station-types.js";

export interface StationRegisteredEvent {
  readonly stationId: CraftStationId;
  readonly definition: CraftStationDefinition;
}

export interface StationResolvedEvent {
  readonly stationId: CraftStationId;
  readonly station: CraftStationDefinition;
}

export interface CraftStationEventMap {
  readonly "station:registered": StationRegisteredEvent;
  readonly "station:resolved": StationResolvedEvent;
}

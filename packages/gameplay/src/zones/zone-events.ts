import type { ZoneDefinitionId, ZoneId } from "./zone-types.js";

// ---------------------------------------------------------------------------
// Event payloads
// ---------------------------------------------------------------------------

export interface ZoneLoadedEvent {
  readonly zoneId: ZoneId;
  readonly definitionId: ZoneDefinitionId;
}

export interface ZoneUnloadedEvent {
  readonly zoneId: ZoneId;
  readonly definitionId: ZoneDefinitionId;
}

export interface ZoneActivatedEvent {
  readonly zoneId: ZoneId;
  readonly definitionId: ZoneDefinitionId;
}

export interface ZoneDeactivatedEvent {
  readonly zoneId: ZoneId;
  readonly definitionId: ZoneDefinitionId;
}

export interface ZoneChangedEvent {
  readonly previousZoneId: ZoneId | undefined;
  readonly previousDefinitionId: ZoneDefinitionId | undefined;
  readonly newZoneId: ZoneId;
  readonly newDefinitionId: ZoneDefinitionId;
}

export interface ZoneDefinitionRegisteredEvent {
  readonly definitionId: ZoneDefinitionId;
  readonly name: string;
  readonly tier: number;
}

// ---------------------------------------------------------------------------
// Event map
// ---------------------------------------------------------------------------

export interface ZoneEventMap {
  zoneLoaded: ZoneLoadedEvent;
  zoneUnloaded: ZoneUnloadedEvent;
  zoneActivated: ZoneActivatedEvent;
  zoneDeactivated: ZoneDeactivatedEvent;
  zoneChanged: ZoneChangedEvent;
  zoneDefinitionRegistered: ZoneDefinitionRegisteredEvent;
}

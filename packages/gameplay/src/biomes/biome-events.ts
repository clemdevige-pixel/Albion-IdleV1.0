import type { ZoneDefinitionId } from "../zones/zone-types.js";
import type { BiomeId } from "./biome-types.js";

// ---------------------------------------------------------------------------
// Event payloads
// ---------------------------------------------------------------------------

export interface BiomeRegisteredEvent {
  readonly biomeId: BiomeId;
  readonly name: string;
}

export interface BiomeResolvedEvent {
  readonly zoneDefId: ZoneDefinitionId;
  readonly biomeId: BiomeId;
}

export interface BiomeChangedEvent {
  readonly previousBiomeId: BiomeId | undefined;
  readonly newBiomeId: BiomeId;
}

export interface BiomeAssociatedEvent {
  readonly zoneDefId: ZoneDefinitionId;
  readonly biomeId: BiomeId;
}

export interface BiomeDissociatedEvent {
  readonly zoneDefId: ZoneDefinitionId;
}

// ---------------------------------------------------------------------------
// Event map
// ---------------------------------------------------------------------------

export interface BiomeEventMap {
  biomeRegistered: BiomeRegisteredEvent;
  biomeResolved: BiomeResolvedEvent;
  biomeChanged: BiomeChangedEvent;
  biomeAssociated: BiomeAssociatedEvent;
  biomeDissociated: BiomeDissociatedEvent;
}

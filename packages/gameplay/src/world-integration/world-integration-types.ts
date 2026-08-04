import type { BiomeId } from "../biomes/biome-types.js";
import type { ExplorationSaveState } from "../exploration/exploration-types.js";
import type { WorldProgressionSaveState } from "../world-progression/world-progression-types.js";
import type { ZoneDefinitionId, ZoneId } from "../zones/zone-types.js";

/** Combined save state for all world subsystems. */
export interface WorldSaveState {
  readonly progression: WorldProgressionSaveState;
  readonly exploration: ExplorationSaveState;
}

/** Payload emitted when the world coordinator changes zone. */
export interface WorldZoneChangedEvent {
  readonly zoneDefId: ZoneDefinitionId;
  readonly zoneId: ZoneId;
  readonly biomeId: BiomeId | undefined;
  readonly isFirstVisit: boolean;
}

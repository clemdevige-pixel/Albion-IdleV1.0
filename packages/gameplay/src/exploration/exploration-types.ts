import type { ZoneDefinitionId } from "../zones/zone-types.js";

/** Record of a single zone discovery. */
export interface ZoneDiscoveryRecord {
  readonly zoneDefId: ZoneDefinitionId;
  readonly firstDiscoveredAt: number;
  readonly visitCount: number;
  readonly lastVisitedAt: number;
}

/** Runtime exploration state (uses Map). */
export interface ExplorationState {
  readonly discoveries: ReadonlyMap<ZoneDefinitionId, ZoneDiscoveryRecord>;
}

/** Serializable exploration state (uses arrays, no Maps). */
export interface ExplorationSaveState {
  readonly discoveries: readonly ZoneDiscoveryRecord[];
}

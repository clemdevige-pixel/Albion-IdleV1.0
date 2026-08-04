import type { ZoneDefinitionId } from "../zones/zone-types.js";

// ---------------------------------------------------------------------------
// Event payloads
// ---------------------------------------------------------------------------

export interface ZoneUnlockedEvent {
  readonly zoneDefId: ZoneDefinitionId;
}

export interface ZoneCompletedEvent {
  readonly zoneDefId: ZoneDefinitionId;
}

export interface ProgressionStateChangedEvent {
  readonly unlockedCount: number;
  readonly completedCount: number;
}

// ---------------------------------------------------------------------------
// Event map
// ---------------------------------------------------------------------------

export interface WorldProgressionEventMap {
  zoneUnlocked: ZoneUnlockedEvent;
  zoneCompleted: ZoneCompletedEvent;
  progressionStateChanged: ProgressionStateChangedEvent;
}

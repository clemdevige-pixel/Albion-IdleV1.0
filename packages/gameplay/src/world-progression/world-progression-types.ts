import type { ZoneDefinitionId } from "../zones/zone-types.js";

// ---------------------------------------------------------------------------
// Unlock condition types
// ---------------------------------------------------------------------------

export type UnlockConditionType =
  | "tier_reached"
  | "zone_completed"
  | "fame_reached"
  | "manual";

export interface UnlockCondition {
  readonly type: UnlockConditionType;
  readonly targetZoneDefId?: ZoneDefinitionId | undefined;
  readonly requiredTier?: number | undefined;
  readonly requiredFame?: number | undefined;
}

// ---------------------------------------------------------------------------
// Zone unlock definition
// ---------------------------------------------------------------------------

export interface ZoneUnlockDefinition {
  readonly zoneDefId: ZoneDefinitionId;
  readonly conditions: readonly UnlockCondition[];
  readonly unlockedByDefault?: boolean | undefined;
}

// ---------------------------------------------------------------------------
// World progression state
// ---------------------------------------------------------------------------

export interface WorldProgressionState {
  readonly unlockedZones: ReadonlySet<ZoneDefinitionId>;
  readonly completedZones: ReadonlySet<ZoneDefinitionId>;
}

// ---------------------------------------------------------------------------
// Serializable state (for save system)
// ---------------------------------------------------------------------------

export interface WorldProgressionSaveState {
  readonly unlockedZones: readonly ZoneDefinitionId[];
  readonly completedZones: readonly ZoneDefinitionId[];
}

// ---------------------------------------------------------------------------
// Evaluation context
// ---------------------------------------------------------------------------

export interface UnlockEvaluationContext {
  readonly currentTier: number;
  readonly currentFame: number;
  readonly completedZones: ReadonlySet<ZoneDefinitionId>;
}

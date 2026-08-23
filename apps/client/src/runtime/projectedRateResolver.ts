import type { ZoneDefinitionId } from "@game/gameplay";
import type { GameBridgeState } from "../game/GameBridge.js";
import { getWorldZonePlacement } from "../data/worldContentCatalog.js";
import {
  calculateProjectedSegmentRates,
  type ProjectedSegmentRates,
} from "./projectedRateCalculator.js";

export interface ProjectedSegmentRateQuery {
  readonly zoneDefId: string;
  /** Zero-based segment index used by the combat/runtime data layer. */
  readonly segmentIndex: number;
}

/**
 * Presentation-facing projected-rate authority.
 *
 * Callers provide only the bridge snapshot plus the target zone/segment. This
 * resolver owns every derived dependency required by the low-level calculator
 * (stats, weapon, autocast, world placement and mastery state), so future yield
 * modifiers cannot be silently omitted by individual UI callsites.
 */
export function resolveProjectedSegmentRates(
  state: GameBridgeState,
  query: ProjectedSegmentRateQuery,
): ProjectedSegmentRates {
  const zoneDefId = query.zoneDefId as ZoneDefinitionId;
  const placement = getWorldZonePlacement(zoneDefId);
  const equippedWeaponId = state.equipment.slots.find((slot) => slot.slot === "weapon")?.itemId;

  return calculateProjectedSegmentRates({
    physicalDamage: getComputedStat(state, "stat_physical_damage"),
    magicalDamage: getComputedStat(state, "stat_magical_damage"),
    attackSpeed: getComputedStat(state, "stat_attack_speed"),
    equippedWeaponId,
    primaryAbilityAutoCast: state.abilities.primary?.autoCast ?? false,
    currentZoneIndex: placement.zoneIndexWithinBand,
    currentZoneDefId: zoneDefId,
    currentWorldBandId: placement.bandId,
    currentSegment: query.segmentIndex,
    masteries: state.progression.masteries,
  });
}

function getComputedStat(state: GameBridgeState, id: string): number {
  return state.stats.stats.find((entry) => entry.id === id)?.computed ?? 0;
}

import type { ZoneDefinitionId } from "@game/gameplay";
import {
  WORLD_ZONE_ORDER,
  getWorldZonePlacement,
} from "./worldContentCatalog.js";

/**
 * World equipment caps are derived from the authoritative zone tier.
 * Keeping this resolver separate gives us one policy boundary if a future zone
 * needs an explicit override without teaching navigation/UI about zone names.
 */
export function getZoneEquipmentTierCap(zoneDefId: ZoneDefinitionId | string): number {
  return getWorldZonePlacement(zoneDefId).tier;
}

export function getZoneEquipmentTierCapByNumber(zoneNumber: number): number | undefined {
  const zoneDefId = WORLD_ZONE_ORDER[zoneNumber - 1];
  return zoneDefId === undefined ? undefined : getZoneEquipmentTierCap(zoneDefId);
}

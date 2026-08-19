import type { ZoneDefinitionId } from "@game/gameplay";
import { getItemTier } from "./itemPower.js";
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

export interface EquipmentTierCapViolation {
  readonly itemId: string;
  readonly itemTier: number;
  readonly maxTier: number;
}

export function getEquipmentTierCapViolation(
  zoneDefId: ZoneDefinitionId | string,
  itemId: string,
): EquipmentTierCapViolation | undefined {
  const itemTier = getItemTier(itemId);
  if (itemTier === undefined) return undefined;
  const maxTier = getZoneEquipmentTierCap(zoneDefId);
  return itemTier > maxTier ? { itemId, itemTier, maxTier } : undefined;
}

export function findEquipmentTierCapViolation(
  zoneDefId: ZoneDefinitionId | string,
  itemIds: readonly string[],
): EquipmentTierCapViolation | undefined {
  for (const itemId of itemIds) {
    const violation = getEquipmentTierCapViolation(zoneDefId, itemId);
    if (violation !== undefined) return violation;
  }
  return undefined;
}

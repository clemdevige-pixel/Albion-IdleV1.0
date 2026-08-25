import { getWorldBandDefinition } from "@game/data";
import type { ZoneDefinitionId } from "@game/gameplay";
import { getItemTier } from "./itemPower.js";
import {
  WORLD_ZONE_ORDER,
  getWorldZonePlacement,
} from "./worldContentCatalog.js";

/**
 * Equipment caps follow the authored maximum tier of each world band.
 * Blue deliberately allows T4 everywhere, including its T3 progression zones.
 * Enchantment level never changes this cap: T4.0 through T4.4 are all T4 here.
 */
export function getZoneEquipmentTierCap(zoneDefId: ZoneDefinitionId | string): number {
  const { bandId } = getWorldZonePlacement(zoneDefId);
  return getWorldBandDefinition(bandId).maximumTier;
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

import {
  REPAIR_LOCATION_TYPES,
  type RepairResult,
  type RepairStationDefinitionLike,
  repairFail,
  repairOk,
} from "./types.js";

/**
 * Immutable registry of repair stations (34_REPAIR_SYSTEM "RepairStationTable").
 * Invalid stations never load, mirroring the VendorRegistry lifecycle.
 */
export class RepairStationRegistry {
  private readonly definitions = new Map<string, RepairStationDefinitionLike>();

  register(
    definition: RepairStationDefinitionLike,
  ): RepairResult<RepairStationDefinitionLike> {
    if (definition.stationId.length === 0) {
      return repairFail("invalid_definition");
    }
    if (this.definitions.has(definition.stationId)) {
      return repairFail("duplicate_station");
    }
    if (!REPAIR_LOCATION_TYPES.includes(definition.locationType)) {
      return repairFail("invalid_location_type");
    }
    if (!Number.isFinite(definition.repairModifier) || definition.repairModifier <= 0) {
      return repairFail("invalid_definition");
    }
    const frozen = Object.freeze({
      stationId: definition.stationId,
      locationType: definition.locationType,
      repairModifier: definition.repairModifier,
      enabled: definition.enabled,
    });
    this.definitions.set(frozen.stationId, frozen);
    return repairOk(frozen);
  }

  has(stationId: string): boolean {
    return this.definitions.has(stationId);
  }

  get(stationId: string): RepairStationDefinitionLike | undefined {
    return this.definitions.get(stationId);
  }

  getAll(): readonly RepairStationDefinitionLike[] {
    return [...this.definitions.values()];
  }
}

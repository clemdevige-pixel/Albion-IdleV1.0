import { describe, expect, it } from "vitest";
import { WORLD_ZONE_IDS } from "./worldContentCatalog";
import {
  getEquipmentTierCapViolation,
  getZoneEquipmentTierCap,
} from "./zoneEquipmentTierCaps";

describe("zone equipment tier caps", () => {
  it("uses the world band cap, including T4 across the entire Blue band", () => {
    expect(getZoneEquipmentTierCap(WORLD_ZONE_IDS.forest)).toBe(4);
    expect(getZoneEquipmentTierCap(WORLD_ZONE_IDS.swamp)).toBe(4);
    expect(getZoneEquipmentTierCap(WORLD_ZONE_IDS.highland)).toBe(4);
    expect(getZoneEquipmentTierCap(WORLD_ZONE_IDS.steppe)).toBe(4);
    expect(getZoneEquipmentTierCap(WORLD_ZONE_IDS.mountain)).toBe(4);

    expect(getZoneEquipmentTierCap(WORLD_ZONE_IDS.amberwood)).toBe(5);
    expect(getZoneEquipmentTierCap(WORLD_ZONE_IDS.cinderwood)).toBe(6);
    expect(getZoneEquipmentTierCap(WORLD_ZONE_IDS.bloodwood)).toBe(7);
    expect(getZoneEquipmentTierCap(WORLD_ZONE_IDS.blackwood)).toBe(8);
  });

  it("allows the cap tier and rejects only a higher base tier", () => {
    expect(
      getEquipmentTierCapViolation(
        WORLD_ZONE_IDS.forest,
        "item_weapon_sword_t4_broadsword",
      ),
    ).toBeUndefined();

    expect(
      getEquipmentTierCapViolation(
        WORLD_ZONE_IDS.forest,
        "item_weapon_sword_t5_broadsword",
      ),
    ).toEqual({
      itemId: "item_weapon_sword_t5_broadsword",
      itemTier: 5,
      maxTier: 4,
    });
  });
});

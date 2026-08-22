import { describe, expect, it } from "vitest";
import { FACTION_CAPE_CONTENT } from "./factionCapeContentCatalog.js";
import { resolveEquipmentInfo } from "./itemContentCatalog.js";

describe("Faction cape tooltip contract", () => {
  it("exposes equipment stats and faction protection for every authored cape", () => {
    for (const cape of FACTION_CAPE_CONTENT) {
      const equipment = resolveEquipmentInfo(cape.itemId);

      expect(equipment).toBeDefined();
      expect(equipment?.slot).toBe("cape");
      expect(equipment?.stats).toEqual(cape.stats);
      expect(cape.dungeonDamageReductionPercent).toBeGreaterThan(0);
      expect(cape.factionId.length).toBeGreaterThan(0);
    }
  });
});

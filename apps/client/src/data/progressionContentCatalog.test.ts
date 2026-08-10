import { describe, expect, it } from "vitest";
import {
  MASTERY_DEFINITIONS,
  getMasteryDisplayName,
} from "./progressionContentCatalog.js";

describe("progressionContentCatalog", () => {
  it("contains each mastery exactly once", () => {
    const ids = MASTERY_DEFINITIONS.map((definition) => definition.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("keeps weapon family and specialization categories from the weapon catalog", () => {
    const byId = new Map(MASTERY_DEFINITIONS.map((definition) => [definition.id, definition]));

    expect(byId.get("mastery_sword")?.category).toBe("weapon");
    expect(byId.get("mastery_bow")?.category).toBe("weapon");
    expect(byId.get("mastery_fire_staff")?.category).toBe("weapon");
    expect(byId.get("mastery_gloves")?.category).toBe("weapon");

    expect(byId.get("mastery_broadsword")?.category).toBe("weapon_specialization");
    expect(byId.get("mastery_longbow")?.category).toBe("weapon_specialization");
    expect(byId.get("mastery_badon")?.category).toBe("weapon_specialization");
    expect(byId.get("mastery_t4_fire_staff")?.category).toBe("weapon_specialization");
    expect(byId.get("mastery_spiked_gauntlets")?.category).toBe("weapon_specialization");
  });

  it("resolves weapon display names from the authoritative weapon catalog", () => {
    expect(getMasteryDisplayName("mastery_sword")).toBe("Épées");
    expect(getMasteryDisplayName("mastery_broadsword")).toBe("Épée large");
    expect(getMasteryDisplayName("mastery_bow")).toBe("Arcs");
    expect(getMasteryDisplayName("mastery_badon")).toBe("Badon");
    expect(getMasteryDisplayName("mastery_fire_staff")).toBe("Bâtons de feu");
    expect(getMasteryDisplayName("mastery_t4_fire_staff")).toBe("Bâton de feu");
    expect(getMasteryDisplayName("mastery_gloves")).toBe("Gants");
    expect(getMasteryDisplayName("mastery_spiked_gauntlets")).toBe("Gantelets à pointes");
  });
});

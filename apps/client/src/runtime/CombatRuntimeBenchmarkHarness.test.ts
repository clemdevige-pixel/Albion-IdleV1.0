import { describe, expect, it } from "vitest";
import { WORLD_ZONE_IDS } from "../data/worldContentCatalog.js";
import { runCombatRuntimeBenchmark } from "./CombatRuntimeBenchmarkHarness.js";

const WEAPON = "item_weapon_bow_t4_longbow";

function runWithEquipment(equipmentItemIds: readonly string[], enchantment: 0 | 3) {
  return runCombatRuntimeBenchmark({
    label: `enchantment-eligibility-${String(enchantment)}`,
    weaponItemId: WEAPON,
    zoneDefId: WORLD_ZONE_IDS.forest,
    segmentIndex: 0,
    equipmentItemIds,
    enchantment,
    masteryLevel: 1,
  });
}

describe("CombatRuntimeBenchmarkHarness enchantment seeding", () => {
  it("does not enchant the non-enchantable T3 Traveler Cape", () => {
    const base = runWithEquipment(["item_traveler_cape"], 0);
    const requestedT43 = runWithEquipment(["item_traveler_cape"], 3);

    expect(requestedT43.magicResistance).toBe(base.magicResistance);
  });

  it("still enchants authored T4 equipment", () => {
    const base = runWithEquipment(["item_helmet_t4_reinforced"], 0);
    const requestedT43 = runWithEquipment(["item_helmet_t4_reinforced"], 3);

    expect(requestedT43.armor).toBeGreaterThan(base.armor);
  });
});

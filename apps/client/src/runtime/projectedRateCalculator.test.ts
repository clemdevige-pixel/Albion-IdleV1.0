import { describe, expect, it } from "vitest";
import type { ZoneDefinitionId } from "@game/gameplay";
import { FACTION_MASTERY_IDS } from "../data/factionMasteryContentCatalog.js";
import { calculateProjectedSegmentRates } from "./projectedRateCalculator.js";

const BASE_INPUT = {
  physicalDamage: 100,
  magicalDamage: 0,
  attackSpeed: 1.2,
  equippedWeaponId: "item_weapon_sword_t3_broadsword",
  primaryAbilityAutoCast: false,
  currentZoneIndex: 0,
  currentZoneDefId: "zone_forest_t3" as ZoneDefinitionId,
  currentWorldBandId: "blue" as const,
  currentSegment: 0,
  masteries: [],
};

describe("calculateProjectedSegmentRates faction yield", () => {
  it("includes current faction mastery in displayed segment yield", () => {
    const baseline = calculateProjectedSegmentRates(BASE_INPUT);
    const boosted = calculateProjectedSegmentRates({
      ...BASE_INPUT,
      masteries: Object.values(FACTION_MASTERY_IDS).map((id) => ({ id, level: 100 })),
    });

    expect(boosted.silverPerHour).toBeGreaterThan(baseline.silverPerHour);
    expect(boosted.famePerHour).toBeGreaterThan(baseline.famePerHour);
    expect(boosted.enchantmentShardsPerHour).toBeCloseTo(
      baseline.enchantmentShardsPerHour * 1.5,
      8,
    );
    expect(boosted.keyFragmentsPerHour).toBeCloseTo(
      baseline.keyFragmentsPerHour * 1.5,
      8,
    );
  });
});

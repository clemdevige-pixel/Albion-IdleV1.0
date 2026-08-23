import { describe, expect, it } from "vitest";
import { createInitialGameBridgeState } from "../game/GameBridge.js";
import { FACTION_MASTERY_IDS } from "../data/factionMasteryContentCatalog.js";
import { resolveProjectedSegmentRates } from "./projectedRateResolver.js";

function createProjectionState(keeperMasteryLevel: number) {
  const initial = createInitialGameBridgeState();
  return {
    ...initial,
    stats: {
      stats: [
        { id: "stat_physical_damage", base: 100, computed: 100 },
        { id: "stat_magical_damage", base: 0, computed: 0 },
        { id: "stat_attack_speed", base: 1.2, computed: 1.2 },
      ],
    },
    equipment: {
      slots: [{
        slot: "weapon" as const,
        itemId: "item_weapon_sword_t3_broadsword",
        instanceId: "projection_weapon",
        enchantment: 0 as const,
        visualManifestId: undefined,
        combatPresentationProfileId: undefined,
        combatPresentation: undefined,
      }],
    },
    progression: {
      ...initial.progression,
      masteries: [{
        id: FACTION_MASTERY_IDS.keeper,
        displayName: "Maîtrise Keeper",
        category: "faction",
        isUnlocked: true,
        level: keeperMasteryLevel,
        currentXp: 0,
        xpToNextLevel: 0,
        totalLifetimeXp: 0,
        maxLevel: 100,
      }],
    },
  };
}

describe("resolveProjectedSegmentRates", () => {
  it("automatically consumes faction mastery from the bridge snapshot", () => {
    const query = { zoneDefId: "zone_forest_t3", segmentIndex: 0 };
    const baseline = resolveProjectedSegmentRates(createProjectionState(0), query);
    const boosted = resolveProjectedSegmentRates(createProjectionState(100), query);

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

import { describe, expect, it } from "vitest";
import { runBlueRuntimeBenchmark } from "../runtime/BlueRuntimeBenchmarkHarness.js";
import { WORLD_ZONE_IDS } from "./worldContentCatalog.js";

const CASES = [
  { weaponItemId: "item_weapon_sword_t3_broadsword", zoneDefId: WORLD_ZONE_IDS.forest, segmentIndex: 9, label: "broadsword_forest_s10" },
  { weaponItemId: "item_weapon_staff_t3_infernal", zoneDefId: WORLD_ZONE_IDS.swamp, segmentIndex: 1, label: "infernal_swamp_s2" },
  { weaponItemId: "item_weapon_dagger_t3_pair", zoneDefId: WORLD_ZONE_IDS.swamp, segmentIndex: 1, label: "dagger_swamp_s2" },
  { weaponItemId: "item_weapon_bow_t3_longbow", zoneDefId: WORLD_ZONE_IDS.swamp, segmentIndex: 2, label: "longbow_swamp_s3" },
  { weaponItemId: "item_weapon_gloves_t3_spiked_gauntlets", zoneDefId: WORLD_ZONE_IDS.swamp, segmentIndex: 2, label: "spiked_swamp_s3" },
] as const;

describe("Blue runtime parity", () => {
  it("reproduces the observed naked early-game walls through the exact live CombatRuntime", () => {
    const rows = CASES.map((input) => runBlueRuntimeBenchmark({ ...input, masteryLevel: 1 }));
    console.table(rows.map(({ label, clear, seconds, hpPercent, encounterReached, maxHealth }) => ({ label, clear, seconds, hpPercent, encounterReached, maxHealth })));
    console.log("[BLUE_RUNTIME_PARITY]", JSON.stringify(rows, null, 2));

    expect(rows).toHaveLength(CASES.length);
    expect(rows.every((row) => row.maxHealth === 300)).toBe(true);
    expect(rows.every((row) => row.clear === false)).toBe(true);
    expect(rows.every((row) => Number.isFinite(row.seconds))).toBe(true);
  });
});

import { describe, expect, it } from "vitest";
import { runBlueRuntimeBenchmark } from "../runtime/BlueRuntimeBenchmarkHarness.js";
import { resolveEquipmentInfo } from "./itemContentCatalog.js";
import { WORLD_ZONE_IDS } from "./worldContentCatalog.js";

const T3_WEAPONS = [
  "item_weapon_sword_t3_broadsword",
  "item_weapon_bow_t3_longbow",
  "item_weapon_staff_t3_infernal",
  "item_weapon_gloves_t3_spiked_gauntlets",
  "item_weapon_dagger_t3_pair",
] as const;

const T3_SHIELD = "item_shield_t3_reinforced";
const FULL_T3 = ["item_iron_helmet", "item_leather_armor", "item_leather_boots", "item_traveler_cape"] as const;

type Probe = {
  readonly id: string;
  readonly segmentIndex: number;
  readonly masteryLevel: number;
  readonly equipment: "none" | "torso" | "two_piece" | "full";
};

const PROBES: readonly Probe[] = [
  { id: "swamp_s1_starter", segmentIndex: 0, masteryLevel: 1, equipment: "none" },
  { id: "swamp_s2_starter", segmentIndex: 1, masteryLevel: 1, equipment: "none" },
  { id: "swamp_s3_torso", segmentIndex: 2, masteryLevel: 4, equipment: "torso" },
  { id: "swamp_s6_two_piece", segmentIndex: 5, masteryLevel: 7, equipment: "two_piece" },
  { id: "swamp_s10_full_t3", segmentIndex: 9, masteryLevel: 10, equipment: "full" },
];

function equipmentFor(weaponItemId: string, probe: Probe): readonly string[] {
  if (probe.equipment === "none") return [];
  if (probe.equipment === "torso") return ["item_leather_armor"];
  if (probe.equipment === "two_piece") return ["item_leather_armor", "item_iron_helmet"];
  const items: string[] = [...FULL_T3];
  if (resolveEquipmentInfo(weaponItemId)?.handling === "one_handed") items.push(T3_SHIELD);
  return items;
}

describe("Blue T3 runtime progression sweep", () => {
  it("prints the validated Forest-to-Swamp progression probes", () => {
    const forestRows = T3_WEAPONS.map((weaponItemId) => runBlueRuntimeBenchmark({
      label: "forest_s10_starter",
      weaponItemId,
      zoneDefId: WORLD_ZONE_IDS.forest,
      segmentIndex: 9,
      masteryLevel: 1,
    }));

    const swampRows = PROBES.flatMap((probe) => T3_WEAPONS.map((weaponItemId) => runBlueRuntimeBenchmark({
      label: probe.id,
      weaponItemId,
      zoneDefId: WORLD_ZONE_IDS.swamp,
      segmentIndex: probe.segmentIndex,
      masteryLevel: probe.masteryLevel,
      equipmentItemIds: equipmentFor(weaponItemId, probe),
    })));

    const rows = [...forestRows, ...swampRows].map((row) => ({
      checkpoint: row.label,
      weapon: row.weaponItemId.replace("item_weapon_", "").replace("_t3_", " "),
      clear: row.clear,
      hpPercent: row.hpPercent,
      encounters: row.encounterReached,
      hp: row.maxHealth,
      armor: row.armor,
      mr: row.magicResistance,
      mastery: row.masteryLevel,
    }));

    console.table(rows);
    console.log("[BLUE_T3_RUNTIME_PROGRESSION_SWEEP]", JSON.stringify(rows, null, 2));
    expect(rows).toHaveLength((PROBES.length + 1) * T3_WEAPONS.length);
    expect(rows.every((row) => row.encounters >= 1 && row.encounters <= 5)).toBe(true);
  });
});

import { describe, expect, it } from "vitest";
import { runCombatRuntimeBenchmark } from "../runtime/CombatRuntimeBenchmarkHarness.js";
import { resolveEquipmentInfo } from "./itemContentCatalog.js";
import {
  HERETIC_T7_DUNGEON_ID,
  KEEPER_T7_DUNGEON_ID,
  MORGANA_T7_DUNGEON_ID,
  UNDEAD_T7_DUNGEON_ID,
} from "./dungeonContentCatalog.js";
import { WORLD_ZONE_IDS } from "./worldContentCatalog.js";

const WEAPONS = [
  "item_weapon_sword_t7_broadsword",
  "item_weapon_bow_t7_longbow",
  "item_weapon_staff_t7_infernal",
  "item_weapon_gloves_t7_spiked_gauntlets",
  "item_weapon_dagger_t7_pair",
] as const;

const ARMOR = ["item_helmet_t7_reinforced", "item_armor_t7_leather", "item_boots_t7_leather", "item_traveler_cape"] as const;
const SHIELD = "item_shield_t7_reinforced";
const DUNGEONS = [KEEPER_T7_DUNGEON_ID, HERETIC_T7_DUNGEON_ID, UNDEAD_T7_DUNGEON_ID, MORGANA_T7_DUNGEON_ID] as const;

type Probe = {
  readonly id: string;
  readonly mastery: number;
  readonly potions: boolean;
};

/**
 * T7 dungeons remain optimization content. This is diagnostic only: the final
 * T4-T8 dungeon balance pass happens once the complete T8 loop is authored.
 */
const PROBES: readonly Probe[] = [
  { id: "t7_3_base", mastery: 1, potions: false },
  { id: "t7_3_mastery55", mastery: 55, potions: false },
  { id: "t7_3_mastery70", mastery: 70, potions: false },
  { id: "t7_3_mastery55_potion", mastery: 55, potions: true },
  { id: "t7_3_mastery70_potion", mastery: 70, potions: true },
];

function equipmentFor(weaponItemId: string): readonly string[] {
  const items: string[] = [...ARMOR];
  if (resolveEquipmentInfo(weaponItemId)?.handling === "one_handed") items.push(SHIELD);
  return items;
}

describe("T7 dungeon optimization sweep", () => {
  it("prints the provisional T7.3++ boundary across all faction dungeons", () => {
    const rows = DUNGEONS.flatMap((dungeonDefinitionId) =>
      PROBES.flatMap((probe) =>
        WEAPONS.map((weaponItemId) => {
          const result = runCombatRuntimeBenchmark({
            label: `${dungeonDefinitionId}_${probe.id}`,
            weaponItemId,
            zoneDefId: WORLD_ZONE_IDS.doompeak,
            segmentIndex: 9,
            equipmentItemIds: equipmentFor(weaponItemId),
            enchantment: 3,
            masteryLevel: probe.mastery,
            useHealthPotions: probe.potions,
            dungeonDefinitionId,
          });
          return {
            dungeon: dungeonDefinitionId.replace("dungeon_", "").replace("_t7", ""),
            probe: probe.id,
            weapon: weaponItemId.replace("item_weapon_", "").replace("_t7_", " "),
            clear: result.clear,
            hpPercent: result.hpPercent,
            seconds: result.seconds,
            encounters: result.encounterReached,
            potionsUsed: result.potionsUsed,
            mastery: result.masteryLevel,
            observedDps: result.observedDps,
          };
        }),
      ),
    );

    console.table(rows);
    console.log("[T7_DUNGEON_OPTIMIZATION_SWEEP]", JSON.stringify(rows, null, 2));

    expect(rows).toHaveLength(DUNGEONS.length * PROBES.length * WEAPONS.length);
    expect(rows.every((row) => Number.isFinite(row.hpPercent))).toBe(true);
    expect(rows.every((row) => Number.isFinite(row.observedDps) && row.observedDps >= 0)).toBe(true);
    expect(rows.every((row) => row.encounters >= 1 && row.encounters <= 5)).toBe(true);
  });
});

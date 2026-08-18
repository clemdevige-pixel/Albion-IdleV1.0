import { describe, expect, it } from "vitest";
import { runCombatRuntimeBenchmark } from "../runtime/CombatRuntimeBenchmarkHarness.js";
import { resolveEquipmentInfo } from "./itemContentCatalog.js";
import {
  HERETIC_T8_DUNGEON_ID,
  KEEPER_T8_DUNGEON_ID,
  MORGANA_T8_DUNGEON_ID,
  UNDEAD_T8_DUNGEON_ID,
} from "./dungeonContentCatalog.js";
import { WORLD_ZONE_IDS } from "./worldContentCatalog.js";

const WEAPONS = [
  "item_weapon_sword_t8_broadsword",
  "item_weapon_bow_t8_longbow",
  "item_weapon_staff_t8_infernal",
  "item_weapon_gloves_t8_spiked_gauntlets",
  "item_weapon_dagger_t8_pair",
] as const;

const ARMOR = ["item_helmet_t8_reinforced", "item_armor_t8_leather", "item_boots_t8_leather", "item_traveler_cape"] as const;
const SHIELD = "item_shield_t8_reinforced";
const DUNGEONS = [KEEPER_T8_DUNGEON_ID, HERETIC_T8_DUNGEON_ID, UNDEAD_T8_DUNGEON_ID, MORGANA_T8_DUNGEON_ID] as const;

type Probe = {
  readonly id: string;
  readonly mastery: number;
  readonly potions: boolean;
};

/**
 * T8 dungeons stay intentionally above the world curve. This test is purely
 * diagnostic until the global T4-T8 world+dungeon balance pass is performed.
 */
const PROBES: readonly Probe[] = [
  { id: "t8_3_base", mastery: 1, potions: false },
  { id: "t8_3_mastery65", mastery: 65, potions: false },
  { id: "t8_3_mastery80", mastery: 80, potions: false },
  { id: "t8_3_mastery65_potion", mastery: 65, potions: true },
  { id: "t8_3_mastery80_potion", mastery: 80, potions: true },
];

function equipmentFor(weaponItemId: string): readonly string[] {
  const items: string[] = [...ARMOR];
  if (resolveEquipmentInfo(weaponItemId)?.handling === "one_handed") items.push(SHIELD);
  return items;
}

describe("T8 dungeon optimization sweep", () => {
  it("prints the provisional T8.3++ boundary across all faction dungeons", () => {
    const rows = DUNGEONS.flatMap((dungeonDefinitionId) =>
      PROBES.flatMap((probe) =>
        WEAPONS.map((weaponItemId) => {
          const result = runCombatRuntimeBenchmark({
            label: `${dungeonDefinitionId}_${probe.id}`,
            weaponItemId,
            zoneDefId: WORLD_ZONE_IDS.blackspire,
            segmentIndex: 9,
            equipmentItemIds: equipmentFor(weaponItemId),
            enchantment: 3,
            masteryLevel: probe.mastery,
            useHealthPotions: probe.potions,
            dungeonDefinitionId,
          });
          return {
            dungeon: dungeonDefinitionId.replace("dungeon_", "").replace("_t8", ""),
            probe: probe.id,
            weapon: weaponItemId.replace("item_weapon_", "").replace("_t8_", " "),
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
    console.log("[T8_DUNGEON_OPTIMIZATION_SWEEP]", JSON.stringify(rows, null, 2));

    expect(rows).toHaveLength(DUNGEONS.length * PROBES.length * WEAPONS.length);
    expect(rows.every((row) => Number.isFinite(row.hpPercent))).toBe(true);
    expect(rows.every((row) => Number.isFinite(row.observedDps) && row.observedDps >= 0)).toBe(true);
    expect(rows.every((row) => row.encounters >= 1 && row.encounters <= 5)).toBe(true);
  });
});

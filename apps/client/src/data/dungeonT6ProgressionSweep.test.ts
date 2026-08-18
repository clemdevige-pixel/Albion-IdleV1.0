import { describe, expect, it } from "vitest";
import { runCombatRuntimeBenchmark } from "../runtime/CombatRuntimeBenchmarkHarness.js";
import { resolveEquipmentInfo } from "./itemContentCatalog.js";
import {
  HERETIC_T6_DUNGEON_ID,
  KEEPER_T6_DUNGEON_ID,
  MORGANA_T6_DUNGEON_ID,
  UNDEAD_T6_DUNGEON_ID,
} from "./dungeonContentCatalog.js";
import { WORLD_ZONE_IDS } from "./worldContentCatalog.js";

const WEAPONS = [
  "item_weapon_sword_t6_broadsword",
  "item_weapon_bow_t6_longbow",
  "item_weapon_staff_t6_infernal",
  "item_weapon_gloves_t6_spiked_gauntlets",
  "item_weapon_dagger_t6_pair",
] as const;

const ARMOR = ["item_helmet_t6_reinforced", "item_armor_t6_leather", "item_boots_t6_leather", "item_traveler_cape"] as const;
const SHIELD = "item_shield_t6_reinforced";
const DUNGEONS = [KEEPER_T6_DUNGEON_ID, HERETIC_T6_DUNGEON_ID, UNDEAD_T6_DUNGEON_ID, MORGANA_T6_DUNGEON_ID] as const;

type Enchantment = 0 | 1 | 2 | 3;

type Probe = {
  readonly id: string;
  readonly mastery: number;
  readonly enchantment: Enchantment;
  readonly potions: boolean;
};

/**
 * T6 faction dungeons are optimization content, not the natural Orange clear.
 * This sweep intentionally prints the boundary before freezing semantic gates:
 * full T6.3 alone should be insufficient, mastery should matter, and the
 * intended clear package is full T6.3 + meaningful mastery + health potions.
 */
const PROBES: readonly Probe[] = [
  { id: "t6_3_base", mastery: 1, enchantment: 3, potions: false },
  { id: "t6_3_mastery45", mastery: 45, enchantment: 3, potions: false },
  { id: "t6_3_mastery60", mastery: 60, enchantment: 3, potions: false },
  { id: "t6_3_mastery45_potion", mastery: 45, enchantment: 3, potions: true },
  { id: "t6_3_mastery60_potion", mastery: 60, enchantment: 3, potions: true },
];

function equipmentFor(weaponItemId: string): readonly string[] {
  const items: string[] = [...ARMOR];
  if (resolveEquipmentInfo(weaponItemId)?.handling === "one_handed") items.push(SHIELD);
  return items;
}

describe("T6 dungeon optimization sweep", () => {
  it("prints the T6.3++ optimization boundary across all faction dungeons", () => {
    const rows = DUNGEONS.flatMap((dungeonDefinitionId) => PROBES.flatMap((probe) => WEAPONS.map((weaponItemId) => {
      const result = runCombatRuntimeBenchmark({
        label: `${dungeonDefinitionId}_${probe.id}`,
        weaponItemId,
        zoneDefId: WORLD_ZONE_IDS.ashenpeak,
        segmentIndex: 9,
        equipmentItemIds: equipmentFor(weaponItemId),
        enchantment: probe.enchantment,
        masteryLevel: probe.mastery,
        useHealthPotions: probe.potions,
        dungeonDefinitionId,
      });
      return {
        dungeon: dungeonDefinitionId.replace("dungeon_", "").replace("_t6", ""),
        probe: probe.id,
        weapon: weaponItemId.replace("item_weapon_", "").replace("_t6_", " "),
        clear: result.clear,
        hpPercent: result.hpPercent,
        seconds: result.seconds,
        encounters: result.encounterReached,
        potionsUsed: result.potionsUsed,
        mastery: result.masteryLevel,
      };
    }))));

    console.table(rows);
    console.log("[T6_DUNGEON_OPTIMIZATION_SWEEP]", JSON.stringify(rows, null, 2));

    expect(rows).toHaveLength(DUNGEONS.length * PROBES.length * WEAPONS.length);
    expect(rows.every((row) => Number.isFinite(row.hpPercent))).toBe(true);
    expect(rows.every((row) => row.encounters >= 1 && row.encounters <= 5)).toBe(true);
  });
});

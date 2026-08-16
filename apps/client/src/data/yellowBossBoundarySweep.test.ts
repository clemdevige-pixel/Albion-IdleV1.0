import { describe, expect, it } from "vitest";
import { runCombatRuntimeBenchmark } from "../runtime/CombatRuntimeBenchmarkHarness.js";
import { resolveEquipmentInfo } from "./itemContentCatalog.js";
import { WORLD_ZONE_IDS } from "./worldContentCatalog.js";

const WEAPONS = [
  "item_weapon_sword_t5_broadsword",
  "item_weapon_bow_t5_longbow",
  "item_weapon_staff_t5_infernal",
  "item_weapon_gloves_t5_spiked_gauntlets",
  "item_weapon_dagger_t5_pair",
] as const;

const ARMOR = [
  "item_helmet_t5_reinforced",
  "item_armor_t5_leather",
  "item_boots_t5_leather",
  "item_traveler_cape",
] as const;

const SHIELD = "item_shield_t5_reinforced";
type Enchantment = 0 | 1 | 2 | 3;
type ZoneKey = "amberwood" | "gloamfen" | "stormwatch" | "sunscar" | "ironveil";

const CASES: readonly {
  readonly zone: ZoneKey;
  readonly mastery: number;
  readonly enchantments: readonly Enchantment[];
}[] = [
  { zone: "amberwood", mastery: 25, enchantments: [0, 1] },
  { zone: "gloamfen", mastery: 27, enchantments: [0, 1] },
  { zone: "stormwatch", mastery: 29, enchantments: [1, 2] },
  { zone: "sunscar", mastery: 32, enchantments: [1, 2, 3] },
  { zone: "ironveil", mastery: 35, enchantments: [2, 3] },
] as const;

function equipmentFor(weaponItemId: string): readonly string[] {
  const items: string[] = [...ARMOR];
  if (resolveEquipmentInfo(weaponItemId)?.handling === "one_handed") items.push(SHIELD);
  return items;
}

describe("Yellow final boss boundary sweep", () => {
  it("measures the enchantment threshold required to clear each Yellow S10", () => {
    const rows = CASES.flatMap((probe) => probe.enchantments.map((enchantment) => {
      const weaponResults = WEAPONS.map((weaponItemId) => {
        const result = runCombatRuntimeBenchmark({
          label: `${probe.zone}_s10_t5_${String(enchantment)}`,
          weaponItemId,
          zoneDefId: WORLD_ZONE_IDS[probe.zone],
          segmentIndex: 9,
          equipmentItemIds: equipmentFor(weaponItemId),
          masteryLevel: probe.mastery,
          enchantment,
          useHealthPotions: false,
        });
        return {
          weapon: weaponItemId.replace("item_weapon_", "").replace("_t5_", " "),
          clear: result.clear,
          hpPercent: result.hpPercent,
          encounters: result.encounterReached,
        };
      });

      const clears = weaponResults.filter((result) => result.clear);
      return {
        zone: probe.zone,
        enchantment,
        mastery: probe.mastery,
        clearCount: clears.length,
        minClearHp: clears.length === 0 ? null : Math.min(...clears.map((result) => result.hpPercent)),
        maxClearHp: clears.length === 0 ? null : Math.max(...clears.map((result) => result.hpPercent)),
        weapons: weaponResults,
      };
    }));

    console.table(rows.map(({ zone, enchantment, mastery, clearCount, minClearHp, maxClearHp }) => ({
      zone,
      enchantment,
      mastery,
      clearCount,
      minClearHp,
      maxClearHp,
    })));
    console.log("[YELLOW_BOSS_BOUNDARY_SWEEP]", JSON.stringify(rows, null, 2));

    expect(rows).toHaveLength(CASES.reduce((total, probe) => total + probe.enchantments.length, 0));
    expect(rows.every((row) => row.clearCount >= 0 && row.clearCount <= WEAPONS.length)).toBe(true);
  });
});

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

type Enchantment = 1 | 2 | 3;
type ZoneKey = "gloamfen" | "stormwatch" | "sunscar" | "ironveil";

/**
 * Diagnostic only: compare Yellow S10 boundaries around the physical/magical
 * boss split, with potion availability as an explicit progression variable.
 * No semantic balance thresholds are frozen here.
 */
const CASES: readonly {
  readonly zone: ZoneKey;
  readonly mastery: number;
  readonly enchantments: readonly Enchantment[];
}[] = [
  { zone: "gloamfen", mastery: 27, enchantments: [1, 2] },
  { zone: "stormwatch", mastery: 29, enchantments: [1, 2] },
  { zone: "sunscar", mastery: 32, enchantments: [2, 3] },
  { zone: "ironveil", mastery: 35, enchantments: [2, 3] },
] as const;

function equipmentFor(weaponItemId: string): readonly string[] {
  const items: string[] = [...ARMOR];
  if (resolveEquipmentInfo(weaponItemId)?.handling === "one_handed") items.push(SHIELD);
  return items;
}

describe("Yellow resistance and potion boundary sweep", () => {
  it("measures S10 physical/magical pressure with and without health potions", () => {
    const rows = CASES.flatMap((probe) => probe.enchantments.flatMap((enchantment) =>
      [false, true].map((useHealthPotions) => {
        const weaponResults = WEAPONS.map((weaponItemId) => {
          const result = runCombatRuntimeBenchmark({
            label: `${probe.zone}_s10_t5_${String(enchantment)}_${useHealthPotions ? "potions" : "no_potions"}`,
            weaponItemId,
            zoneDefId: WORLD_ZONE_IDS[probe.zone],
            segmentIndex: 9,
            equipmentItemIds: equipmentFor(weaponItemId),
            masteryLevel: probe.mastery,
            enchantment,
            useHealthPotions,
          });
          return {
            weapon: weaponItemId.replace("item_weapon_", "").replace("_t5_", " "),
            clear: result.clear,
            hpPercent: result.hpPercent,
            encounters: result.encounterReached,
            potionsUsed: result.potionsUsed,
            hp: result.maxHealth,
            armor: result.armor,
            magicResistance: result.magicResistance,
          };
        });

        return {
          zone: probe.zone,
          enchantment,
          mastery: probe.mastery,
          potions: useHealthPotions,
          clearCount: weaponResults.filter((result) => result.clear).length,
          weapons: weaponResults,
        };
      }),
    ));

    console.table(rows.map(({ zone, enchantment, mastery, potions, clearCount }) => ({
      zone,
      enchantment,
      mastery,
      potions,
      clearCount,
    })));
    console.log("[YELLOW_RESISTANCE_BOUNDARY_SWEEP]", JSON.stringify(rows, null, 2));

    expect(rows).toHaveLength(CASES.reduce((total, probe) => total + probe.enchantments.length * 2, 0));
    expect(rows.every((row) => row.clearCount >= 0 && row.clearCount <= WEAPONS.length)).toBe(true);
    expect(rows.every((row) => row.weapons.every((weapon) => weapon.magicResistance >= 0 && weapon.armor >= 0))).toBe(true);
  });
});

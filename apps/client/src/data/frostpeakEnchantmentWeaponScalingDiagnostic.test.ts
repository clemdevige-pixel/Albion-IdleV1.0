import { describe, expect, it } from "vitest";
import { runCombatRuntimeBenchmark } from "../runtime/CombatRuntimeBenchmarkHarness.js";
import { resolveEquipmentInfo } from "./itemContentCatalog.js";
import { WORLD_ZONE_IDS } from "./worldContentCatalog.js";

type Enchantment = 0 | 1 | 2 | 3;
type Weapon = "broadsword" | "longbow" | "infernal" | "spiked" | "dual_dagger";

const WEAPONS: readonly Weapon[] = ["broadsword", "longbow", "infernal", "spiked", "dual_dagger"];
const MASTERY_BY_ENCHANTMENT: Readonly<Record<Enchantment, number>> = {
  0: 16,
  1: 19,
  2: 22,
  3: 22,
};

function weaponId(weapon: Weapon): string {
  if (weapon === "broadsword") return "item_weapon_sword_t4_broadsword";
  if (weapon === "longbow") return "item_weapon_bow_t4_longbow";
  if (weapon === "infernal") return "item_weapon_staff_t4_infernal";
  if (weapon === "spiked") return "item_weapon_gloves_t4_spiked_gauntlets";
  return "item_weapon_dagger_t4_pair";
}

function equipmentFor(itemId: string): readonly string[] {
  const items = [
    "item_helmet_t4_reinforced",
    "item_armor_t4_leather",
    "item_boots_t4_leather",
    "item_traveler_cape",
  ];
  if (resolveEquipmentInfo(itemId)?.handling === "one_handed") items.push("item_shield_t4_reinforced");
  return items;
}

describe("Frostpeak enchantment weapon scaling diagnostic", () => {
  it("measures .0 -> .3 progression depth per representative weapon", () => {
    const rows: Array<{
      weapon: Weapon;
      enchantment: Enchantment;
      mastery: number;
      deepestClear: number;
      firstFail: number | null;
      deepestHpPercent: number;
      deepestSeconds: number;
      deepestObservedDps: number;
      deepestDamageReceived: number;
      gainVsPrevious: number | null;
    }> = [];

    for (const weapon of WEAPONS) {
      const itemId = weaponId(weapon);
      let previousDepth: number | null = null;
      for (const enchantment of [0, 1, 2, 3] as const) {
        let deepestClear = 0;
        let firstFail: number | null = null;
        let deepestHpPercent = 0;
        let deepestSeconds = 0;
        let deepestObservedDps = 0;
        let deepestDamageReceived = 0;

        for (let segmentIndex = 0; segmentIndex < 10; segmentIndex += 1) {
          const result = runCombatRuntimeBenchmark({
            label: `frostpeak_scaling_${weapon}_${String(enchantment)}_s${String(segmentIndex + 1)}`,
            weaponItemId: itemId,
            zoneDefId: WORLD_ZONE_IDS.mountain,
            segmentIndex,
            equipmentItemIds: equipmentFor(itemId),
            masteryLevel: MASTERY_BY_ENCHANTMENT[enchantment],
            enchantment,
            useHealthPotions: false,
          });

          if (!result.clear) {
            firstFail = segmentIndex + 1;
            break;
          }

          deepestClear = segmentIndex + 1;
          deepestHpPercent = result.hpPercent;
          deepestSeconds = result.seconds;
          deepestObservedDps = result.observedDps;
          deepestDamageReceived = result.damageReceived;
        }

        rows.push({
          weapon,
          enchantment,
          mastery: MASTERY_BY_ENCHANTMENT[enchantment],
          deepestClear,
          firstFail,
          deepestHpPercent,
          deepestSeconds,
          deepestObservedDps,
          deepestDamageReceived,
          gainVsPrevious: previousDepth === null ? null : deepestClear - previousDepth,
        });
        previousDepth = deepestClear;
      }
    }

    console.log("[FROSTPEAK_ENCHANTMENT_WEAPON_SCALING]");
    console.table(rows);
    console.log("[FROSTPEAK_ENCHANTMENT_WEAPON_SCALING_JSON]", JSON.stringify(rows, null, 2));

    expect(rows).toHaveLength(WEAPONS.length * 4);
    expect(rows.every((row) => row.deepestClear >= 0 && row.deepestClear <= 10)).toBe(true);
  }, 60_000);
});

import { describe, expect, it } from "vitest";
import { WORLD_ZONE_IDS } from "./worldContentCatalog.js";
import { runEnchantmentShardTtkBenchmark } from "./enchantmentShardTtkBenchmark.js";

const weaponItemId = "item_weapon_dagger_t4_pair";
const equipmentItemIds = [
  "item_helmet_t4_reinforced",
  "item_armor_t4_leather",
  "item_boots_t4_leather",
  "item_traveler_cape",
] as const;

function run(useHealthPotions: boolean) {
  return Array.from({ length: 10 }, (_, segmentIndex) => {
    const result = runEnchantmentShardTtkBenchmark({
      label: `dagger_t4_3_amberwood_s${String(segmentIndex + 1)}_${useHealthPotions ? "potion" : "no_potion"}`,
      weaponItemId,
      zoneDefId: WORLD_ZONE_IDS.amberwood,
      segmentIndex,
      equipmentItemIds,
      masteryLevel: 23,
      enchantment: 3,
      useHealthPotions,
    });

    return {
      segment: segmentIndex + 1,
      clear: result.clear,
      hpPercent: result.hpPercent,
      shardsPerHour: Number(result.expectedShardsPerHour.toFixed(1)),
    };
  });
}

describe("Dagger Pair T4.3 -> Amberwood bridge diagnostic", () => {
  it("compares autonomous and potion-assisted entry", () => {
    const noPotion = run(false);
    const withPotion = run(true);

    console.log("[DAGGER_T4_3_AMBERWOOD_NO_POTION]");
    console.table(noPotion);
    console.log("[DAGGER_T4_3_AMBERWOOD_WITH_POTION]");
    console.table(withPotion);

    const firstPotionClear = withPotion.find((row) => row.clear) ?? null;
    console.log("[DAGGER_T4_3_AMBERWOOD_BRIDGE_SUMMARY]", JSON.stringify({
      noPotionCanFarm: noPotion.some((row) => row.clear),
      potionCanBridge: firstPotionClear !== null,
      firstPotionClear,
    }, null, 2));

    expect(noPotion).toHaveLength(10);
    expect(withPotion).toHaveLength(10);
  });
});

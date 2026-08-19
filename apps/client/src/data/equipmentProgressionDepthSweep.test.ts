import { describe, expect, it } from "vitest";
import { runCombatRuntimeBenchmark } from "../runtime/CombatRuntimeBenchmarkHarness.js";
import { resolveEquipmentInfo } from "./itemContentCatalog.js";
import { WORLD_ZONE_IDS } from "./worldContentCatalog.js";

const WEAPONS_BY_TIER = {
  3: ["item_weapon_sword_t3_broadsword", "item_weapon_bow_t3_longbow", "item_weapon_staff_t3_infernal", "item_weapon_gloves_t3_spiked_gauntlets", "item_weapon_dagger_t3_pair"],
  4: ["item_weapon_sword_t4_broadsword", "item_weapon_bow_t4_longbow", "item_weapon_staff_t4_infernal", "item_weapon_gloves_t4_spiked_gauntlets", "item_weapon_dagger_t4_pair"],
  5: ["item_weapon_sword_t5_broadsword", "item_weapon_bow_t5_longbow", "item_weapon_staff_t5_infernal", "item_weapon_gloves_t5_spiked_gauntlets", "item_weapon_dagger_t5_pair"],
  6: ["item_weapon_sword_t6_broadsword", "item_weapon_bow_t6_longbow", "item_weapon_staff_t6_infernal", "item_weapon_gloves_t6_spiked_gauntlets", "item_weapon_dagger_t6_pair"],
  7: ["item_weapon_sword_t7_broadsword", "item_weapon_bow_t7_longbow", "item_weapon_staff_t7_infernal", "item_weapon_gloves_t7_spiked_gauntlets", "item_weapon_dagger_t7_pair"],
} as const;

type Tier = keyof typeof WEAPONS_BY_TIER;
type Enchantment = 0 | 1 | 2 | 3;
type Variant = "weapon_only" | "chest" | "chest_head" | "core" | "full";

type Scenario = {
  readonly label: string;
  readonly tier: Tier;
  readonly enchantment: Enchantment;
  readonly mastery: number;
  readonly zoneDefId: string;
};

const SCENARIOS: readonly Scenario[] = [
  { label: "T3_swamp", tier: 3, enchantment: 0, mastery: 10, zoneDefId: WORLD_ZONE_IDS.swamp },
  { label: "T4_0_steppe", tier: 4, enchantment: 0, mastery: 16, zoneDefId: WORLD_ZONE_IDS.steppe },
  { label: "T4_3_amberwood", tier: 4, enchantment: 3, mastery: 23, zoneDefId: WORLD_ZONE_IDS.amberwood },
  { label: "T5_3_cinderwood", tier: 5, enchantment: 3, mastery: 36, zoneDefId: WORLD_ZONE_IDS.cinderwood },
  { label: "T6_3_bloodwood", tier: 6, enchantment: 3, mastery: 46, zoneDefId: WORLD_ZONE_IDS.bloodwood },
  { label: "T7_3_blackwood", tier: 7, enchantment: 3, mastery: 56, zoneDefId: WORLD_ZONE_IDS.blackwood },
] as const;

const VARIANTS: readonly Variant[] = ["weapon_only", "chest", "chest_head", "core", "full"];

function armorIds(tier: Tier): { head: string; chest: string; boots: string } {
  if (tier === 3) return { head: "item_iron_helmet", chest: "item_leather_armor", boots: "item_leather_boots" };
  return {
    head: `item_helmet_t${String(tier)}_reinforced`,
    chest: `item_armor_t${String(tier)}_leather`,
    boots: `item_boots_t${String(tier)}_leather`,
  };
}

function equipmentFor(tier: Tier, weaponId: string, variant: Variant): readonly string[] {
  if (variant === "weapon_only") return [];
  const { head, chest, boots } = armorIds(tier);
  const items: string[] = [chest];
  if (variant === "chest") return items;
  items.push(head);
  if (variant === "chest_head") return items;
  items.push(boots);
  if (variant === "core") return items;
  items.push("item_traveler_cape");
  if (resolveEquipmentInfo(weaponId)?.handling === "one_handed") {
    items.push(tier === 3 ? "item_shield_t3_reinforced" : `item_shield_t${String(tier)}_reinforced`);
  }
  return items;
}

function shortWeaponName(itemId: string): string {
  return itemId.replace("item_weapon_", "").replace(/_t[3-7]_/, " ");
}

function round1(value: number): number { return Number(value.toFixed(1)); }

function deepestClear(scenario: Scenario, weaponId: string, variant: Variant) {
  let deepestSegment = 0;
  let hpPercent = 0;
  for (let segmentIndex = 0; segmentIndex < 10; segmentIndex += 1) {
    const result = runCombatRuntimeBenchmark({
      label: `${scenario.label}_${variant}_${weaponId}_s${String(segmentIndex + 1)}`,
      weaponItemId: weaponId,
      zoneDefId: scenario.zoneDefId as never,
      segmentIndex,
      equipmentItemIds: equipmentFor(scenario.tier, weaponId, variant),
      masteryLevel: scenario.mastery,
      enchantment: scenario.enchantment,
      useHealthPotions: false,
    });
    if (!result.clear) break;
    deepestSegment = segmentIndex + 1;
    hpPercent = round1(result.hpPercent);
  }
  return { deepestSegment, hpPercent };
}

describe("equipment progression depth sweep", () => {
  it("measures how many zone segments each successive equipment state buys", () => {
    const rows = SCENARIOS.flatMap((scenario) =>
      WEAPONS_BY_TIER[scenario.tier].flatMap((weaponId) =>
        VARIANTS.map((variant) => ({
          scenario: scenario.label,
          weapon: shortWeaponName(weaponId),
          variant,
          ...deepestClear(scenario, weaponId, variant),
        })),
      ),
    );

    const summary = SCENARIOS.flatMap((scenario) => VARIANTS.map((variant) => {
      const matches = rows.filter((row) => row.scenario === scenario.label && row.variant === variant);
      return {
        scenario: scenario.label,
        variant,
        minDepth: Math.min(...matches.map((row) => row.deepestSegment)),
        avgDepth: round1(matches.reduce((sum, row) => sum + row.deepestSegment, 0) / matches.length),
        maxDepth: Math.max(...matches.map((row) => row.deepestSegment)),
      };
    }));

    console.log("[EQUIPMENT_PROGRESSION_DEPTH_DETAIL]");
    console.table(rows);
    console.log("[EQUIPMENT_PROGRESSION_DEPTH_SUMMARY]");
    console.table(summary);
    console.log("[EQUIPMENT_PROGRESSION_DEPTH_SUMMARY_JSON]", JSON.stringify(summary, null, 2));

    expect(rows).toHaveLength(SCENARIOS.length * 5 * VARIANTS.length);
    expect(summary).toHaveLength(SCENARIOS.length * VARIANTS.length);
  });
});

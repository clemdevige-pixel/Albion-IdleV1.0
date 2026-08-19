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
type Variant = "full" | "no_boots" | "no_head";

type Checkpoint = {
  readonly label: string;
  readonly tier: Tier;
  readonly enchantment: Enchantment;
  readonly mastery: number;
  readonly zoneDefId: string;
  readonly segmentIndex: number;
};

const CHECKPOINTS: readonly Checkpoint[] = [
  { label: "T3_swamp_s9", tier: 3, enchantment: 0, mastery: 10, zoneDefId: WORLD_ZONE_IDS.swamp, segmentIndex: 8 },
  { label: "T4_3_amberwood_s1", tier: 4, enchantment: 3, mastery: 23, zoneDefId: WORLD_ZONE_IDS.amberwood, segmentIndex: 0 },
  { label: "T5_3_cinderwood_s1", tier: 5, enchantment: 3, mastery: 36, zoneDefId: WORLD_ZONE_IDS.cinderwood, segmentIndex: 0 },
  { label: "T6_3_bloodwood_s1", tier: 6, enchantment: 3, mastery: 46, zoneDefId: WORLD_ZONE_IDS.bloodwood, segmentIndex: 0 },
  { label: "T7_3_blackwood_s1", tier: 7, enchantment: 3, mastery: 56, zoneDefId: WORLD_ZONE_IDS.blackwood, segmentIndex: 0 },
];

function coreIds(tier: Tier): { head: string; chest: string; boots: string } {
  if (tier === 3) return { head: "item_iron_helmet", chest: "item_leather_armor", boots: "item_leather_boots" };
  return {
    head: `item_helmet_t${String(tier)}_reinforced`,
    chest: `item_armor_t${String(tier)}_leather`,
    boots: `item_boots_t${String(tier)}_leather`,
  };
}

function equipmentFor(tier: Tier, weaponId: string, variant: Variant): readonly string[] {
  const { head, chest, boots } = coreIds(tier);
  const items = [chest, "item_traveler_cape"];
  if (variant !== "no_head") items.push(head);
  if (variant !== "no_boots") items.push(boots);
  if (resolveEquipmentInfo(weaponId)?.handling === "one_handed") {
    items.push(tier === 3 ? "item_shield_t3_reinforced" : `item_shield_t${String(tier)}_reinforced`);
  }
  return items;
}

function shortWeaponName(itemId: string): string {
  return itemId.replace("item_weapon_", "").replace(/_t[3-7]_/, " ");
}

function round1(value: number): number { return Number(value.toFixed(1)); }

describe("boots defensive impact sweep", () => {
  it("compares full set, no boots and no head on representative progression walls", () => {
    const variants: readonly Variant[] = ["full", "no_boots", "no_head"];
    const rows = CHECKPOINTS.flatMap((checkpoint) => WEAPONS_BY_TIER[checkpoint.tier].flatMap((weaponId) => variants.map((variant) => {
      const result = runCombatRuntimeBenchmark({
        label: `${checkpoint.label}_${variant}_${weaponId}`,
        weaponItemId: weaponId,
        zoneDefId: checkpoint.zoneDefId as never,
        segmentIndex: checkpoint.segmentIndex,
        equipmentItemIds: equipmentFor(checkpoint.tier, weaponId, variant),
        masteryLevel: checkpoint.mastery,
        enchantment: checkpoint.enchantment,
        useHealthPotions: false,
      });
      return {
        checkpoint: checkpoint.label,
        weapon: shortWeaponName(weaponId),
        variant,
        clear: result.clear,
        hpPercent: round1(result.hpPercent),
        maxHealth: result.maxHealth,
        armor: result.armor,
        mr: result.magicResistance,
        seconds: round1(result.seconds),
      };
    }))));

    console.log("[BOOTS_DEFENSIVE_IMPACT_SWEEP]");
    console.table(rows);
    console.log("[BOOTS_DEFENSIVE_IMPACT_SWEEP_JSON]", JSON.stringify(rows, null, 2));

    expect(rows).toHaveLength(CHECKPOINTS.length * 5 * 3);
    expect(rows.every((row) => Number.isFinite(row.hpPercent))).toBe(true);
  });
});

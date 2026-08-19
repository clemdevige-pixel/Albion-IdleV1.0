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
  { label: "T4_0_steppe_s6", tier: 4, enchantment: 0, mastery: 16, zoneDefId: WORLD_ZONE_IDS.steppe, segmentIndex: 5 },
  { label: "T4_3_amberwood_s1", tier: 4, enchantment: 3, mastery: 23, zoneDefId: WORLD_ZONE_IDS.amberwood, segmentIndex: 0 },
  { label: "T5_3_cinderwood_s1", tier: 5, enchantment: 3, mastery: 36, zoneDefId: WORLD_ZONE_IDS.cinderwood, segmentIndex: 0 },
  { label: "T6_3_bloodwood_s1", tier: 6, enchantment: 3, mastery: 46, zoneDefId: WORLD_ZONE_IDS.bloodwood, segmentIndex: 0 },
  { label: "T7_3_blackwood_s1", tier: 7, enchantment: 3, mastery: 56, zoneDefId: WORLD_ZONE_IDS.blackwood, segmentIndex: 0 },
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

describe("equipment progression impact sweep", () => {
  it("measures each successive armor craft on representative T3-to-T8 progression walls", () => {
    const rows = CHECKPOINTS.flatMap((checkpoint) =>
      WEAPONS_BY_TIER[checkpoint.tier].flatMap((weaponId) =>
        VARIANTS.map((variant) => {
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
        }),
      ),
    );

    const summary = CHECKPOINTS.flatMap((checkpoint) => VARIANTS.map((variant) => {
      const matches = rows.filter((row) => row.checkpoint === checkpoint.label && row.variant === variant);
      const clears = matches.filter((row) => row.clear);
      return {
        checkpoint: checkpoint.label,
        variant,
        clears: clears.length,
        totalWeapons: matches.length,
        avgHpOnClear: clears.length === 0 ? 0 : round1(clears.reduce((sum, row) => sum + row.hpPercent, 0) / clears.length),
      };
    }));

    console.log("[EQUIPMENT_PROGRESSION_IMPACT_DETAIL]");
    console.table(rows);
    console.log("[EQUIPMENT_PROGRESSION_IMPACT_SUMMARY]");
    console.table(summary);
    console.log("[EQUIPMENT_PROGRESSION_IMPACT_SUMMARY_JSON]", JSON.stringify(summary, null, 2));

    expect(rows).toHaveLength(CHECKPOINTS.length * 5 * VARIANTS.length);
    expect(summary).toHaveLength(CHECKPOINTS.length * VARIANTS.length);
  });
});

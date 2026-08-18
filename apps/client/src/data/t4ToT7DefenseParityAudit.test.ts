import { describe, expect, it } from "vitest";
import { getEnemyCombatProfile } from "@game/gameplay";
import { runCombatRuntimeBenchmark } from "../runtime/CombatRuntimeBenchmarkHarness.js";
import { resolveEquipmentInfo } from "./itemContentCatalog.js";
import { WORLD_ZONE_CONTENT, WORLD_ZONE_IDS, getWorldZonePlacement, type WorldZoneKey } from "./worldContentCatalog.js";

const WEAPONS_BY_TIER = {
  4: ["item_weapon_sword_t4_broadsword", "item_weapon_bow_t4_longbow", "item_weapon_staff_t4_infernal", "item_weapon_gloves_t4_spiked_gauntlets", "item_weapon_dagger_t4_pair"],
  5: ["item_weapon_sword_t5_broadsword", "item_weapon_bow_t5_longbow", "item_weapon_staff_t5_infernal", "item_weapon_gloves_t5_spiked_gauntlets", "item_weapon_dagger_t5_pair"],
  6: ["item_weapon_sword_t6_broadsword", "item_weapon_bow_t6_longbow", "item_weapon_staff_t6_infernal", "item_weapon_gloves_t6_spiked_gauntlets", "item_weapon_dagger_t6_pair"],
  7: ["item_weapon_sword_t7_broadsword", "item_weapon_bow_t7_longbow", "item_weapon_staff_t7_infernal", "item_weapon_gloves_t7_spiked_gauntlets", "item_weapon_dagger_t7_pair"],
} as const;

const ARMOR_BY_TIER = {
  4: ["item_helmet_t4_reinforced", "item_armor_t4_leather", "item_boots_t4_leather", "item_traveler_cape"],
  5: ["item_helmet_t5_reinforced", "item_armor_t5_leather", "item_boots_t5_leather", "item_traveler_cape"],
  6: ["item_helmet_t6_reinforced", "item_armor_t6_leather", "item_boots_t6_leather", "item_traveler_cape"],
  7: ["item_helmet_t7_reinforced", "item_armor_t7_leather", "item_boots_t7_leather", "item_traveler_cape"],
} as const;

const SHIELD_BY_TIER = {
  4: "item_shield_t4_reinforced",
  5: "item_shield_t5_reinforced",
  6: "item_shield_t6_reinforced",
  7: "item_shield_t7_reinforced",
} as const;

type Tier = keyof typeof WEAPONS_BY_TIER;
type Enchantment = 0 | 1 | 2 | 3;

type AuditCheckpoint = {
  readonly id: string;
  readonly tier: Tier;
  readonly zone: WorldZoneKey;
  readonly segmentIndex: 0 | 9;
  readonly mastery: number;
  readonly enchantment: Enchantment;
};

/**
 * Cross-tier diagnostic only. It deliberately samples the first and final
 * segment of the final authored zone for each T4-T7 band so the same live
 * runtime path can expose how physical Armor vs magical MR pressure evolves.
 * No balance expectation is frozen here.
 */
const CHECKPOINTS: readonly AuditCheckpoint[] = [
  { id: "t4_frostpeak_s1", tier: 4, zone: "mountain", segmentIndex: 0, mastery: 20, enchantment: 3 },
  { id: "t4_frostpeak_s10", tier: 4, zone: "mountain", segmentIndex: 9, mastery: 20, enchantment: 3 },
  { id: "t5_ironveil_s1", tier: 5, zone: "ironveil", segmentIndex: 0, mastery: 35, enchantment: 3 },
  { id: "t5_ironveil_s10", tier: 5, zone: "ironveil", segmentIndex: 9, mastery: 35, enchantment: 3 },
  { id: "t6_ashenpeak_s1", tier: 6, zone: "ashenpeak", segmentIndex: 0, mastery: 45, enchantment: 3 },
  { id: "t6_ashenpeak_s10", tier: 6, zone: "ashenpeak", segmentIndex: 9, mastery: 45, enchantment: 3 },
  { id: "t7_doompeak_s1", tier: 7, zone: "doompeak", segmentIndex: 0, mastery: 55, enchantment: 3 },
  { id: "t7_doompeak_s10", tier: 7, zone: "doompeak", segmentIndex: 9, mastery: 55, enchantment: 3 },
];

function equipmentFor(weaponItemId: string, tier: Tier): readonly string[] {
  const items: string[] = [...ARMOR_BY_TIER[tier]];
  if (resolveEquipmentInfo(weaponItemId)?.handling === "one_handed") items.push(SHIELD_BY_TIER[tier]);
  return items;
}

describe("T4-T7 physical/magical defense parity audit", () => {
  it("prints the live cross-tier defense and weapon performance matrix", () => {
    const rows = CHECKPOINTS.flatMap((checkpoint) => {
      const zoneDefId = WORLD_ZONE_IDS[checkpoint.zone];
      const placement = getWorldZonePlacement(zoneDefId);
      const normalProfile = getEnemyCombatProfile(placement.zoneIndexWithinBand, checkpoint.segmentIndex, 0, placement.bandId);
      const finalProfile = getEnemyCombatProfile(placement.zoneIndexWithinBand, checkpoint.segmentIndex, 4, placement.bandId);

      return WEAPONS_BY_TIER[checkpoint.tier].map((weaponItemId) => {
        const result = runCombatRuntimeBenchmark({
          label: checkpoint.id,
          weaponItemId,
          zoneDefId,
          segmentIndex: checkpoint.segmentIndex,
          equipmentItemIds: equipmentFor(weaponItemId, checkpoint.tier),
          masteryLevel: checkpoint.mastery,
          enchantment: checkpoint.enchantment,
        });
        return {
          checkpoint: checkpoint.id,
          band: placement.bandId,
          tier: checkpoint.tier,
          zone: WORLD_ZONE_CONTENT[checkpoint.zone].name,
          segment: checkpoint.segmentIndex + 1,
          weapon: weaponItemId.replace("item_weapon_", "").replace(`_t${checkpoint.tier}_`, " "),
          normalArmor: normalProfile.armor,
          normalMr: normalProfile.magicResistance,
          normalArmorToMr: Number((normalProfile.armor / Math.max(1, normalProfile.magicResistance)).toFixed(2)),
          finalArmor: finalProfile.armor,
          finalMr: finalProfile.magicResistance,
          finalArmorToMr: Number((finalProfile.armor / Math.max(1, finalProfile.magicResistance)).toFixed(2)),
          clear: result.clear,
          seconds: result.seconds,
          damageDealt: result.damageDealt,
          damageReceived: result.damageReceived,
          observedDps: result.observedDps,
          hpPercent: result.hpPercent,
          encounters: result.encounterReached,
        };
      });
    });

    console.table(rows);
    console.log("[T4_T7_DEFENSE_PARITY_AUDIT]", JSON.stringify(rows, null, 2));

    expect(rows).toHaveLength(CHECKPOINTS.length * 5);
    expect(rows.every((row) => Number.isFinite(row.normalArmorToMr) && Number.isFinite(row.finalArmorToMr))).toBe(true);
    expect(rows.every((row) => Number.isFinite(row.observedDps) && row.observedDps >= 0)).toBe(true);
  });
});

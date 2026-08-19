import { describe, expect, it } from "vitest";
import { ENCHANTMENT_SHARD_COSTS } from "@game/gameplay";
import { resolveEquipmentInfo } from "./itemContentCatalog.js";
import { WORLD_ZONE_IDS } from "./worldContentCatalog.js";
import { runEnchantmentShardTtkBenchmark } from "./enchantmentShardTtkBenchmark.js";

const FULL_SET_EQUIVALENT_ITEM_COUNT = 5;
const FIRST_FULL_SET_SHARD_COST = ENCHANTMENT_SHARD_COSTS[1] * FULL_SET_EQUIVALENT_ITEM_COUNT;

const BRIDGES = [
  { fromTier: 4, toTier: 5, mastery: 23, zone: "amberwood" },
  { fromTier: 5, toTier: 6, mastery: 36, zone: "cinderwood" },
  { fromTier: 6, toTier: 7, mastery: 46, zone: "bloodwood" },
  { fromTier: 7, toTier: 8, mastery: 56, zone: "blackwood" },
] as const;

const WEAPON_FAMILIES = ["sword_broadsword", "bow_longbow", "staff_infernal", "gloves_spiked_gauntlets", "dagger_pair"] as const;

function weaponId(tier: number, family: string): string {
  const [kind, ...rest] = family.split("_");
  return `item_weapon_${kind}_t${String(tier)}_${rest.join("_")}`;
}

function armorIds(tier: number): readonly string[] {
  return [
    `item_helmet_t${String(tier)}_reinforced`,
    `item_armor_t${String(tier)}_leather`,
    `item_boots_t${String(tier)}_leather`,
    "item_traveler_cape",
  ];
}

function equipmentFor(weaponItemId: string, tier: number): readonly string[] {
  const items = [...armorIds(tier)];
  if (resolveEquipmentInfo(weaponItemId)?.handling === "one_handed") {
    items.push(`item_shield_t${String(tier)}_reinforced`);
  }
  return items;
}

function shortName(itemId: string, tier: number): string {
  return itemId.replace("item_weapon_", "").replace(`_t${String(tier)}_`, " ");
}

describe("enchantment tier bridge sweep", () => {
  it("keeps previous-tier .3 sets able to farm the entry zone of the next band", () => {
    const summaries = BRIDGES.map((bridge) => {
      const zoneDefId = WORLD_ZONE_IDS[bridge.zone];
      const rows = WEAPON_FAMILIES.map((family) => {
        const weaponItemId = weaponId(bridge.fromTier, family);
        const candidates = Array.from({ length: 10 }, (_, segmentIndex) => {
          const result = runEnchantmentShardTtkBenchmark({
            label: `bridge_t${String(bridge.fromTier)}_3_to_t${String(bridge.toTier)}_${bridge.zone}_s${String(segmentIndex + 1)}`,
            weaponItemId,
            zoneDefId,
            segmentIndex,
            equipmentItemIds: equipmentFor(weaponItemId, bridge.fromTier),
            masteryLevel: bridge.mastery,
            enchantment: 3,
            useHealthPotions: false,
          });
          return {
            segment: segmentIndex + 1,
            clear: result.clear,
            hpPercent: result.hpPercent,
            shardsPerHour: Number(result.expectedShardsPerHour.toFixed(1)),
          };
        });
        const clearRows = candidates.filter((row) => row.clear);
        const best = clearRows.reduce<(typeof clearRows)[number] | undefined>(
          (current, row) => current === undefined || row.shardsPerHour > current.shardsPerHour ? row : current,
          undefined,
        );
        const deepest = clearRows.reduce<(typeof clearRows)[number] | undefined>(
          (current, row) => current === undefined || row.segment > current.segment ? row : current,
          undefined,
        );
        return {
          weapon: shortName(weaponItemId, bridge.fromTier),
          fromGear: `T${String(bridge.fromTier)}.3`,
          targetShards: `T${String(bridge.toTier)}`,
          zone: bridge.zone,
          mastery: bridge.mastery,
          deepestSegment: deepest?.segment ?? null,
          bestFarmSegment: best?.segment ?? null,
          shardsPerHour: best?.shardsPerHour ?? 0,
          hpPercent: best?.hpPercent ?? 0,
          hoursToFirstFullPointOne: best === undefined || best.shardsPerHour <= 0
            ? null
            : Number((FIRST_FULL_SET_SHARD_COST / best.shardsPerHour).toFixed(2)),
        };
      });

      const summary = {
        bridge: `T${String(bridge.fromTier)}.3->T${String(bridge.toTier)}.1 shards`,
        zone: bridge.zone,
        mastery: bridge.mastery,
        allWeaponsCanFarm: rows.every((row) => row.bestFarmSegment !== null),
        minShardsPerHour: Math.min(...rows.map((row) => row.shardsPerHour)),
        avgShardsPerHour: Number((rows.reduce((sum, row) => sum + row.shardsPerHour, 0) / rows.length).toFixed(1)),
      };

      console.log(`[ENCHANTMENT_TIER_BRIDGE_T${String(bridge.fromTier)}_TO_T${String(bridge.toTier)}]`);
      console.table(rows);
      console.table([summary]);
      return { summary, rows };
    });

    console.log("[ENCHANTMENT_TIER_BRIDGE_SUMMARY]", JSON.stringify(summaries, null, 2));
    expect(summaries).toHaveLength(BRIDGES.length);
    expect(summaries.every(({ rows }) => rows.length === WEAPON_FAMILIES.length)).toBe(true);
    expect(summaries.every(({ summary }) => summary.allWeaponsCanFarm)).toBe(true);
  }, 60_000);
});

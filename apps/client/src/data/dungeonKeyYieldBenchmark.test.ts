import { describe, expect, it } from "vitest";
import { runCombatRuntimeBenchmark } from "../runtime/CombatRuntimeBenchmarkHarness.js";
import { resolveEquipmentInfo } from "./itemContentCatalog.js";
import { WORLD_ZONE_IDS } from "./worldContentCatalog.js";
import {
  BASE_COMBAT_DROP_RATES,
  BOSS_SPECIAL_DROP_MULTIPLIER,
  KEY_FRAGMENTS_PER_KEY,
  getDungeonKeyProgressionWeight,
} from "./economyContentCatalog.js";

const WEAPONS_BY_TIER = {
  4: [
    "item_weapon_sword_t4_broadsword",
    "item_weapon_bow_t4_longbow",
    "item_weapon_staff_t4_infernal",
    "item_weapon_gloves_t4_spiked_gauntlets",
    "item_weapon_dagger_t4_pair",
  ],
  5: [
    "item_weapon_sword_t5_broadsword",
    "item_weapon_bow_t5_longbow",
    "item_weapon_staff_t5_infernal",
    "item_weapon_gloves_t5_spiked_gauntlets",
    "item_weapon_dagger_t5_pair",
  ],
} as const;

const ARMOR_BY_TIER = {
  4: ["item_helmet_t4_reinforced", "item_armor_t4_leather", "item_boots_t4_leather", "item_traveler_cape"],
  5: ["item_helmet_t5_reinforced", "item_armor_t5_leather", "item_boots_t5_leather", "item_traveler_cape"],
} as const;

const SHIELD_BY_TIER = {
  4: "item_shield_t4_reinforced",
  5: "item_shield_t5_reinforced",
} as const;

type Tier = 4 | 5;

function equipmentFor(weaponItemId: string, tier: Tier): readonly string[] {
  const items: string[] = [...ARMOR_BY_TIER[tier]];
  if (resolveEquipmentInfo(weaponItemId)?.handling === "one_handed") items.push(SHIELD_BY_TIER[tier]);
  return items;
}

function expectedKeysPerSegment(keyDropWeight: number): number {
  const equivalentKeysPerNormalKill = (
    BASE_COMBAT_DROP_RATES.completeKey
    + BASE_COMBAT_DROP_RATES.keyFragment / KEY_FRAGMENTS_PER_KEY
  ) * keyDropWeight;
  return equivalentKeysPerNormalKill * (4 + BOSS_SPECIAL_DROP_MULTIPLIER);
}

function projectedKeysPerHour(segmentSeconds: number, keyDropWeight: number): number {
  if (segmentSeconds <= 0) return 0;
  return expectedKeysPerSegment(keyDropWeight) * (3600 / segmentSeconds);
}

describe("dungeon key runtime yield benchmark", () => {
  it("prints end-of-band projected key equivalents per hour for Blue and Yellow", () => {
    const checkpoints = [
      { band: "blue" as const, zoneIndex: 4, zoneDefId: WORLD_ZONE_IDS.mountain, tier: 4 as const, mastery: 22, enchantment: 3 as const },
      { band: "yellow" as const, zoneIndex: 4, zoneDefId: WORLD_ZONE_IDS.ironveil, tier: 5 as const, mastery: 35, enchantment: 3 as const },
    ];

    const rows = checkpoints.flatMap((checkpoint) => {
      const keyDropWeight = getDungeonKeyProgressionWeight(checkpoint.band, checkpoint.zoneIndex, 9);
      return WEAPONS_BY_TIER[checkpoint.tier].map((weaponItemId) => {
        const result = runCombatRuntimeBenchmark({
          label: `${checkpoint.band}_key_yield_end`,
          weaponItemId,
          zoneDefId: checkpoint.zoneDefId,
          segmentIndex: 9,
          equipmentItemIds: equipmentFor(weaponItemId, checkpoint.tier),
          masteryLevel: checkpoint.mastery,
          enchantment: checkpoint.enchantment,
          useHealthPotions: false,
        });
        return {
          band: checkpoint.band,
          weapon: weaponItemId,
          clear: result.clear,
          seconds: result.seconds,
          keyDropWeight,
          projectedKeysPerHour: result.clear
            ? Number(projectedKeysPerHour(result.seconds, keyDropWeight).toFixed(2))
            : 0,
        };
      });
    });

    console.table(rows);
    console.log("[DUNGEON_KEY_YIELD_BENCHMARK]", JSON.stringify(rows, null, 2));

    expect(rows).toHaveLength(10);
    expect(rows.every(({ seconds }) => Number.isFinite(seconds) && seconds > 0)).toBe(true);
  });
});

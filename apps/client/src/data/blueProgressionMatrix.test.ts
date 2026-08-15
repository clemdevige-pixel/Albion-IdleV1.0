import { describe, expect, it } from "vitest";
import { benchmarkBlueSegment } from "./blueProgressionBenchmark";
import { resolveEquipmentInfo } from "./itemContentCatalog";
import {
  T3_DEFENSIVE_LOADOUT,
  T3_SHIELD,
  T4_DEFENSIVE_LOADOUT,
  T4_SHIELD,
  type BenchmarkDefensiveLoadout,
  type BenchmarkEnchantment,
} from "./weaponIdealBenchmark";
import { WORLD_ZONE_IDS } from "./worldContentCatalog";

const T3_WEAPONS = [
  "item_weapon_sword_t3_broadsword",
  "item_weapon_bow_t3_longbow",
  "item_weapon_staff_t3_infernal",
  "item_weapon_gloves_t3_spiked_gauntlets",
  "item_weapon_dagger_t3_pair",
] as const;

const T4_WEAPONS = [
  "item_weapon_sword_t4_broadsword",
  "item_weapon_bow_t4_longbow",
  "item_weapon_staff_t4_infernal",
  "item_weapon_gloves_t4_spiked_gauntlets",
  "item_weapon_dagger_t4_pair",
] as const;

const T3_TORSO_ONLY = ["item_leather_armor"] as const;

type WeaponTier = 3 | 4;
type Checkpoint = {
  readonly id: string;
  readonly zoneDefId: (typeof WORLD_ZONE_IDS)[keyof typeof WORLD_ZONE_IDS];
  readonly segmentIndex: number;
  readonly weaponTier: WeaponTier;
  readonly masteryLevel: number;
  readonly enchantment: BenchmarkEnchantment;
  readonly armorItemIds: readonly string[];
  readonly includeOffHandForOneHanded: boolean;
  readonly useHealthPotions: boolean;
};

const CHECKPOINTS: readonly Checkpoint[] = [
  {
    id: "forest_s10_starter_only",
    zoneDefId: WORLD_ZONE_IDS.forest,
    segmentIndex: 9,
    weaponTier: 3,
    masteryLevel: 4,
    enchantment: 0,
    armorItemIds: [],
    includeOffHandForOneHanded: false,
    useHealthPotions: false,
  },
  {
    id: "swamp_s2_starter_only",
    zoneDefId: WORLD_ZONE_IDS.swamp,
    segmentIndex: 1,
    weaponTier: 3,
    masteryLevel: 5,
    enchantment: 0,
    armorItemIds: [],
    includeOffHandForOneHanded: false,
    useHealthPotions: false,
  },
  {
    id: "swamp_s6_torso_t3",
    zoneDefId: WORLD_ZONE_IDS.swamp,
    segmentIndex: 5,
    weaponTier: 3,
    masteryLevel: 7,
    enchantment: 0,
    armorItemIds: T3_TORSO_ONLY,
    includeOffHandForOneHanded: false,
    useHealthPotions: false,
  },
  {
    id: "swamp_s10_full_t3",
    zoneDefId: WORLD_ZONE_IDS.swamp,
    segmentIndex: 9,
    weaponTier: 3,
    masteryLevel: 10,
    enchantment: 0,
    armorItemIds: T3_DEFENSIVE_LOADOUT,
    includeOffHandForOneHanded: true,
    useHealthPotions: false,
  },
  {
    id: "highland_s6_full_t3_potion",
    zoneDefId: WORLD_ZONE_IDS.highland,
    segmentIndex: 5,
    weaponTier: 3,
    masteryLevel: 10,
    enchantment: 0,
    armorItemIds: T3_DEFENSIVE_LOADOUT,
    includeOffHandForOneHanded: true,
    useHealthPotions: true,
  },
  {
    id: "highland_s6_t4_0",
    zoneDefId: WORLD_ZONE_IDS.highland,
    segmentIndex: 5,
    weaponTier: 4,
    masteryLevel: 10,
    enchantment: 0,
    armorItemIds: T4_DEFENSIVE_LOADOUT,
    includeOffHandForOneHanded: true,
    useHealthPotions: false,
  },
  {
    id: "steppe_s10_t4_0",
    zoneDefId: WORLD_ZONE_IDS.steppe,
    segmentIndex: 9,
    weaponTier: 4,
    masteryLevel: 15,
    enchantment: 0,
    armorItemIds: T4_DEFENSIVE_LOADOUT,
    includeOffHandForOneHanded: true,
    useHealthPotions: true,
  },
  {
    id: "steppe_s10_t4_1",
    zoneDefId: WORLD_ZONE_IDS.steppe,
    segmentIndex: 9,
    weaponTier: 4,
    masteryLevel: 15,
    enchantment: 1,
    armorItemIds: T4_DEFENSIVE_LOADOUT,
    includeOffHandForOneHanded: true,
    useHealthPotions: false,
  },
  {
    id: "mountain_s10_t4_2",
    zoneDefId: WORLD_ZONE_IDS.mountain,
    segmentIndex: 9,
    weaponTier: 4,
    masteryLevel: 20,
    enchantment: 2,
    armorItemIds: T4_DEFENSIVE_LOADOUT,
    includeOffHandForOneHanded: true,
    useHealthPotions: true,
  },
  {
    id: "mountain_s10_t4_3_comfort",
    zoneDefId: WORLD_ZONE_IDS.mountain,
    segmentIndex: 9,
    weaponTier: 4,
    masteryLevel: 20,
    enchantment: 3,
    armorItemIds: T4_DEFENSIVE_LOADOUT,
    includeOffHandForOneHanded: true,
    useHealthPotions: false,
  },
] as const;

function shortWeaponName(itemId: string): string {
  return itemId
    .replace("item_weapon_", "")
    .replace("_t3_", " ")
    .replace("_t4_", " ");
}

function buildLoadout(
  weaponItemId: string,
  checkpoint: Checkpoint,
): BenchmarkDefensiveLoadout {
  const info = resolveEquipmentInfo(weaponItemId);
  const isOneHanded = info?.handling === "one_handed";
  const offHandItemId = checkpoint.includeOffHandForOneHanded && isOneHanded
    ? checkpoint.weaponTier === 3 ? T3_SHIELD : T4_SHIELD
    : undefined;

  return {
    armorItemIds: checkpoint.armorItemIds,
    ...(offHandItemId === undefined ? {} : { offHandItemId }),
  };
}

function runCheckpoint(checkpoint: Checkpoint) {
  const weapons = checkpoint.weaponTier === 3 ? T3_WEAPONS : T4_WEAPONS;
  return weapons.map((weaponItemId) => {
    const result = benchmarkBlueSegment({
      weaponItemId,
      masteryLevel: checkpoint.masteryLevel,
      enchantment: checkpoint.enchantment,
      zoneDefId: checkpoint.zoneDefId,
      segmentIndex: checkpoint.segmentIndex,
      useHealthPotions: checkpoint.useHealthPotions,
      defensiveLoadout: buildLoadout(weaponItemId, checkpoint),
    });

    return {
      checkpoint: checkpoint.id,
      weapon: shortWeaponName(weaponItemId),
      clear: result.clear,
      ttkSeconds: Number(result.totalTimeSeconds.toFixed(1)),
      hpPercent: Number((result.remainingHealthRatio * 100).toFixed(1)),
      potions: result.potionsUsed,
      encounters: result.encounters.length,
    };
  });
}

describe("Blue progression real weapon matrix", () => {
  it("prints every validated progression checkpoint using real offensive and defensive packages", () => {
    const rows = CHECKPOINTS.flatMap(runCheckpoint);

    console.table(rows);
    console.log("[BLUE_PROGRESSION_REAL_WEAPON_MATRIX]", JSON.stringify(rows, null, 2));

    expect(rows).toHaveLength(CHECKPOINTS.length * T3_WEAPONS.length);
    expect(rows.every((row) => Number.isFinite(row.ttkSeconds))).toBe(true);
    expect(rows.every((row) => Number.isFinite(row.hpPercent))).toBe(true);
    expect(rows.every((row) => row.encounters >= 1 && row.encounters <= 5)).toBe(true);
  });

  it("keeps one-handed off-hand rules tied to the authored weapon handling", () => {
    const fullT3 = CHECKPOINTS.find((checkpoint) => checkpoint.id === "swamp_s10_full_t3");
    expect(fullT3).toBeDefined();
    if (fullT3 === undefined) return;

    for (const weaponItemId of T3_WEAPONS) {
      const info = resolveEquipmentInfo(weaponItemId);
      const loadout = buildLoadout(weaponItemId, fullT3);
      if (info?.handling === "one_handed") {
        expect(loadout.offHandItemId).toBe(T3_SHIELD);
      } else {
        expect(loadout.offHandItemId).toBeUndefined();
      }
    }
  });
});

import {
  BLACK_WORLD_COMBAT_CURVE,
  ORANGE_WORLD_COMBAT_CURVE,
  YELLOW_WORLD_COMBAT_CURVE,
  type ZoneCombatCurve,
} from "@game/data";
import { resolveEquipmentInfo } from "../apps/client/src/data/itemContentCatalog.js";
import { WORLD_ZONE_IDS } from "../apps/client/src/data/worldContentCatalog.js";
import { runCombatRuntimeBenchmark } from "../apps/client/src/runtime/CombatRuntimeBenchmarkHarness.js";

type Tier = 5 | 6 | 8;
type Enchantment = 0 | 1 | 2 | 3;
type MutableZoneCombatCurve = {
  healthStart: number;
  healthEnd: number;
  damageStart: number;
  damageEnd: number;
  defenseStart: number;
  defenseEnd: number;
  defenseModel: ZoneCombatCurve["defenseModel"];
  bossGate?: ZoneCombatCurve["bossGate"];
};

interface Target {
  readonly label: string;
  readonly zoneDefId: string;
  readonly zone: MutableZoneCombatCurve;
  readonly tier: Tier;
  readonly enchantment: Enchantment;
  readonly masteryLevel: number;
}

const WEAPON_FAMILIES = [
  ["sword", "broadsword"],
  ["bow", "longbow"],
  ["staff", "infernal"],
  ["gloves", "spiked_gauntlets"],
  ["dagger", "pair"],
] as const;

const START_SCALES = [1, 0.98, 0.96, 0.94, 0.92, 0.9, 0.88, 0.86, 0.84, 0.82, 0.8, 0.78, 0.76, 0.74, 0.72, 0.7, 0.68, 0.66, 0.64, 0.62, 0.6] as const;

function weaponItemIds(tier: Tier): readonly string[] {
  return WEAPON_FAMILIES.map(([family, specialization]) =>
    `item_weapon_${family}_t${String(tier)}_${specialization}`,
  );
}

function armorItemIds(tier: Tier): readonly string[] {
  return [
    `item_helmet_t${String(tier)}_reinforced`,
    `item_armor_t${String(tier)}_leather`,
    `item_boots_t${String(tier)}_leather`,
    "item_traveler_cape",
  ];
}

function equipmentFor(weaponItemId: string, tier: Tier): readonly string[] {
  const items = [...armorItemIds(tier)];
  if (resolveEquipmentInfo(weaponItemId)?.handling === "one_handed") {
    items.push(`item_shield_t${String(tier)}_reinforced`);
  }
  return items;
}

function hasNonMonotonicClear(results: readonly boolean[]): boolean {
  let wallSeen = false;
  for (const clear of results) {
    if (!clear) {
      wallSeen = true;
      continue;
    }
    if (wallSeen) return true;
  }
  return false;
}

const targets: readonly Target[] = [
  {
    label: "Ironveil Peaks",
    zoneDefId: String(WORLD_ZONE_IDS.ironveil),
    zone: YELLOW_WORLD_COMBAT_CURVE[4] as MutableZoneCombatCurve,
    tier: 5,
    enchantment: 2,
    masteryLevel: 35,
  },
  {
    label: "Rotfen Marsh",
    zoneDefId: String(WORLD_ZONE_IDS.rotfen),
    zone: ORANGE_WORLD_COMBAT_CURVE[1] as MutableZoneCombatCurve,
    tier: 6,
    enchantment: 0,
    masteryLevel: 42,
  },
  {
    label: "Obsidian Highlands",
    zoneDefId: String(WORLD_ZONE_IDS.obsidianHighlands),
    zone: BLACK_WORLD_COMBAT_CURVE[2] as MutableZoneCombatCurve,
    tier: 8,
    enchantment: 1,
    masteryLevel: 74,
  },
  {
    label: "Duskfall Steppe",
    zoneDefId: String(WORLD_ZONE_IDS.duskfallSteppe),
    zone: BLACK_WORLD_COMBAT_CURVE[3] as MutableZoneCombatCurve,
    tier: 8,
    enchantment: 2,
    masteryLevel: 77,
  },
];

for (const target of targets) {
  const original = {
    healthStart: target.zone.healthStart,
    damageStart: target.zone.damageStart,
    defenseStart: target.zone.defenseStart,
  };
  const candidates: Array<{
    scale: number;
    healthStart: number;
    damageStart: number;
    defenseStart: number;
    anomalies: number;
    firstWalls: string;
  }> = [];

  try {
    for (const scale of START_SCALES) {
      target.zone.healthStart = original.healthStart * scale;
      target.zone.damageStart = original.damageStart * scale;
      target.zone.defenseStart = original.defenseStart * scale;

      let anomalies = 0;
      const firstWalls: string[] = [];

      for (const weaponItemId of weaponItemIds(target.tier)) {
        const clears: boolean[] = [];
        for (let segmentIndex = 0; segmentIndex < 10; segmentIndex += 1) {
          const result = runCombatRuntimeBenchmark({
            label: `non_monotonic_${target.label}_${String(scale)}`,
            weaponItemId,
            zoneDefId: target.zoneDefId,
            segmentIndex,
            equipmentItemIds: equipmentFor(weaponItemId, target.tier),
            masteryLevel: target.masteryLevel,
            enchantment: target.enchantment,
            useHealthPotions: false,
          });
          clears.push(result.clear);
        }

        if (hasNonMonotonicClear(clears)) anomalies += 1;
        const firstWall = clears.findIndex((clear) => !clear);
        firstWalls.push(firstWall < 0 ? "-" : `S${String(firstWall + 1)}`);
      }

      candidates.push({
        scale,
        healthStart: Number(target.zone.healthStart.toFixed(4)),
        damageStart: Number(target.zone.damageStart.toFixed(4)),
        defenseStart: Number(target.zone.defenseStart.toFixed(4)),
        anomalies,
        firstWalls: firstWalls.join(","),
      });

      if (anomalies === 0) break;
    }
  } finally {
    target.zone.healthStart = original.healthStart;
    target.zone.damageStart = original.damageStart;
    target.zone.defenseStart = original.defenseStart;
  }

  console.log(`[${target.label.toUpperCase().replaceAll(" ", "_")}_START_CANDIDATES]`);
  console.table(candidates);
  console.log(
    `[${target.label.toUpperCase().replaceAll(" ", "_")}_START_CANDIDATES_JSON]`,
    JSON.stringify(candidates, null, 2),
  );
}

console.log("[NON_MONOTONIC_START_SWEEP_CONTRACT]", {
  mutation: "zone healthStart/damageStart/defenseStart only; end values and bossGate untouched",
  target: "zero wall-then-later-clear anomalies across all five weapon profiles without potion",
  selection: "highest start scale that reaches zero anomalies",
});

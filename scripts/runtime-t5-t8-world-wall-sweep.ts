import { resolveEquipmentInfo } from "../apps/client/src/data/itemContentCatalog.js";
import {
  WORLD_ZONE_IDS_BY_BAND,
  ZONE_DEFINITIONS,
} from "../apps/client/src/data/worldContentCatalog.js";
import { runCombatRuntimeBenchmark } from "../apps/client/src/runtime/CombatRuntimeBenchmarkHarness.js";

type Tier = 4 | 5 | 6 | 7 | 8;
type TargetTier = 5 | 6 | 7 | 8;
type Enchantment = 0 | 1 | 2 | 3;
type BandId = "yellow" | "orange" | "red" | "black";
type Contract = "profile_potion_ok" | "potion_bridge" | "afk_clear" | "wall";

const BAND_BY_TIER: Readonly<Record<TargetTier, BandId>> = {
  5: "yellow",
  6: "orange",
  7: "red",
  8: "black",
};

const WEAPON_FAMILIES = [
  ["sword", "broadsword"],
  ["bow", "longbow"],
  ["staff", "infernal"],
  ["gloves", "spiked_gauntlets"],
  ["dagger", "pair"],
] as const;

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

function shieldItemId(tier: Tier): string {
  return `item_shield_t${String(tier)}_reinforced`;
}

function equipmentFor(weaponItemId: string, tier: Tier): readonly string[] {
  const items = [...armorItemIds(tier)];
  if (resolveEquipmentInfo(weaponItemId)?.handling === "one_handed") {
    items.push(shieldItemId(tier));
  }
  return items;
}

function zoneName(zoneDefId: string): string {
  return ZONE_DEFINITIONS.find(({ id }) => String(id) === zoneDefId)?.name ?? zoneDefId;
}

interface Checkpoint {
  readonly id: string;
  readonly zoneIndex: 0 | 1 | 2 | 3 | 4;
  readonly segmentIndex: number;
  readonly gearTier: Tier;
  readonly enchantment: Enchantment;
  readonly masteryLevel: number;
  readonly contract: Contract;
}

function masteryBaseForTier(tier: TargetTier): number {
  // Diagnostic reference only. Yellow already uses roughly M25-M35; later bands
  // advance by 15 mastery levels so the sweep compares like-for-like progression.
  return 25 + (tier - 5) * 15;
}

function checkpointsForTier(tier: TargetTier): readonly Checkpoint[] {
  const base = masteryBaseForTier(tier);
  const previousTier = (tier - 1) as Tier;

  return [
    {
      id: `t${tier}_entry_previous_tier_3`,
      zoneIndex: 0,
      segmentIndex: 0,
      gearTier: previousTier,
      enchantment: 3,
      masteryLevel: Math.max(0, base - 2),
      contract: "profile_potion_ok",
    },
    {
      id: `t${tier}_zone1_s10_t${tier}_0`,
      zoneIndex: 0,
      segmentIndex: 9,
      gearTier: tier,
      enchantment: 0,
      masteryLevel: base,
      contract: "profile_potion_ok",
    },
    {
      id: `t${tier}_zone2_s10_t${tier}_0`,
      zoneIndex: 1,
      segmentIndex: 9,
      gearTier: tier,
      enchantment: 0,
      masteryLevel: base + 2,
      contract: "profile_potion_ok",
    },
    {
      id: `t${tier}_zone3_s10_t${tier}_1`,
      zoneIndex: 2,
      segmentIndex: 9,
      gearTier: tier,
      enchantment: 1,
      masteryLevel: base + 4,
      contract: "profile_potion_ok",
    },
    {
      id: `t${tier}_zone4_s10_t${tier}_2`,
      zoneIndex: 3,
      segmentIndex: 9,
      gearTier: tier,
      enchantment: 2,
      masteryLevel: base + 7,
      contract: "profile_potion_ok",
    },
    {
      id: `t${tier}_final_s5_t${tier}_2`,
      zoneIndex: 4,
      segmentIndex: 4,
      gearTier: tier,
      enchantment: 2,
      masteryLevel: base + 9,
      contract: "profile_potion_ok",
    },
    {
      id: `t${tier}_final_s10_t${tier}_2_wall`,
      zoneIndex: 4,
      segmentIndex: 9,
      gearTier: tier,
      enchantment: 2,
      masteryLevel: base + 10,
      contract: "wall",
    },
    {
      id: `t${tier}_final_s10_t${tier}_2_potion`,
      zoneIndex: 4,
      segmentIndex: 9,
      gearTier: tier,
      enchantment: 2,
      masteryLevel: base + 10,
      contract: "potion_bridge",
    },
    {
      id: `t${tier}_final_s10_t${tier}_3_afk`,
      zoneIndex: 4,
      segmentIndex: 9,
      gearTier: tier,
      enchantment: 3,
      masteryLevel: base + 10,
      contract: "afk_clear",
    },
  ];
}

interface WeaponResult {
  readonly weapon: string;
  readonly clear: boolean;
  readonly hp: number;
  readonly seconds: number;
  readonly potions: number;
  readonly encounters: number;
}

function shortWeaponName(itemId: string): string {
  return itemId.replace("item_weapon_", "").replace(/_t\d_/, " ");
}

function runCheckpoint(tier: TargetTier, checkpoint: Checkpoint) {
  const bandId = BAND_BY_TIER[tier];
  const zoneDefId = WORLD_ZONE_IDS_BY_BAND[bandId][checkpoint.zoneIndex];
  if (zoneDefId === undefined) {
    throw new Error(`Missing zone ${checkpoint.zoneIndex + 1} for ${bandId}`);
  }

  const useHealthPotions = checkpoint.contract === "potion_bridge";
  const weapons = weaponItemIds(checkpoint.gearTier);

  const baseline: WeaponResult[] = weapons.map((weaponItemId) => {
    const result = runCombatRuntimeBenchmark({
      label: checkpoint.id,
      weaponItemId,
      zoneDefId,
      segmentIndex: checkpoint.segmentIndex,
      equipmentItemIds: equipmentFor(weaponItemId, checkpoint.gearTier),
      masteryLevel: checkpoint.masteryLevel,
      enchantment: checkpoint.enchantment,
      useHealthPotions,
    });

    return {
      weapon: shortWeaponName(weaponItemId),
      clear: result.clear,
      hp: result.hpPercent,
      seconds: result.seconds,
      potions: result.potionsUsed,
      encounters: result.encounterReached,
    };
  });

  let potionBridged: string[] = [];
  let unresolved: string[] = [];

  if (checkpoint.contract === "profile_potion_ok") {
    const failures = baseline.filter(({ clear }) => !clear);
    for (const failed of failures) {
      const weaponItemId = weapons.find((candidate) => shortWeaponName(candidate) === failed.weapon);
      if (weaponItemId === undefined) continue;
      const retry = runCombatRuntimeBenchmark({
        label: `${checkpoint.id}_potion_retry`,
        weaponItemId,
        zoneDefId,
        segmentIndex: checkpoint.segmentIndex,
        equipmentItemIds: equipmentFor(weaponItemId, checkpoint.gearTier),
        masteryLevel: checkpoint.masteryLevel,
        enchantment: checkpoint.enchantment,
        useHealthPotions: true,
      });
      if (retry.clear) potionBridged.push(failed.weapon);
      else unresolved.push(failed.weapon);
    }
  }

  const clears = baseline.filter(({ clear }) => clear).length;
  const total = baseline.length;
  let status: "PASS" | "REVIEW";

  switch (checkpoint.contract) {
    case "profile_potion_ok":
      status = unresolved.length === 0 ? "PASS" : "REVIEW";
      break;
    case "potion_bridge":
      status = clears === total ? "PASS" : "REVIEW";
      unresolved = baseline.filter(({ clear }) => !clear).map(({ weapon }) => weapon);
      break;
    case "afk_clear":
      status = clears === total ? "PASS" : "REVIEW";
      unresolved = baseline.filter(({ clear }) => !clear).map(({ weapon }) => weapon);
      break;
    case "wall":
      status = clears < total ? "PASS" : "REVIEW";
      break;
  }

  return {
    tier,
    band: bandId,
    checkpoint: checkpoint.id,
    contract: checkpoint.contract,
    zone: zoneName(String(zoneDefId)),
    segment: checkpoint.segmentIndex + 1,
    gear: `T${checkpoint.gearTier}.${checkpoint.enchantment}`,
    mastery: checkpoint.masteryLevel,
    baselineClears: `${clears}/${total}`,
    potionBridged: potionBridged.length === 0 ? "-" : potionBridged.join(", "),
    unresolved: unresolved.length === 0 ? "-" : unresolved.join(", "),
    status,
    weaponResults: baseline,
  };
}

function main(): void {
  const rows = ([5, 6, 7, 8] as const).flatMap((tier) =>
    checkpointsForTier(tier).map((checkpoint) => runCheckpoint(tier, checkpoint)),
  );

  console.log("[T5_T8_WORLD_WALL_SWEEP_REFERENCE]");
  console.log({
    purpose: "diagnostic wall inspection before semantic contracts are frozen",
    tiers: [5, 6, 7, 8],
    weaponsPerCheckpoint: 5,
    profilePotionFallback: true,
    note: "Mastery references beyond Yellow are diagnostic extrapolations, not design law.",
  });

  console.log("[T5_T8_WORLD_WALL_SWEEP_SUMMARY]");
  console.table(rows.map(({ weaponResults: _weaponResults, ...row }) => row));

  for (const tier of [5, 6, 7, 8] as const) {
    const tierRows = rows.filter((row) => row.tier === tier);
    console.log(`[T${tier}_WORLD_WALL_DETAILS]`);
    for (const row of tierRows) {
      console.log(`${row.status} | ${row.checkpoint} | ${row.zone} S${row.segment} | ${row.gear} M${row.mastery} | ${row.contract}`);
      console.table(row.weaponResults);
    }
  }

  const reviews = rows.filter(({ status }) => status === "REVIEW");
  console.log("[T5_T8_WORLD_WALL_SWEEP_RESULT]", {
    checkpoints: rows.length,
    pass: rows.length - reviews.length,
    review: reviews.length,
    reviewIds: reviews.map(({ checkpoint }) => checkpoint),
  });
}

main();

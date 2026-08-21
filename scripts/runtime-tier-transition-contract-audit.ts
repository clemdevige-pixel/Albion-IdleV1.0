import { resolveEquipmentInfo } from "../apps/client/src/data/itemContentCatalog.js";
import {
  WORLD_ZONE_IDS_BY_BAND,
  ZONE_DEFINITIONS,
} from "../apps/client/src/data/worldContentCatalog.js";
import { runCombatRuntimeBenchmark } from "../apps/client/src/runtime/CombatRuntimeBenchmarkHarness.js";

type Tier = 4 | 5 | 6 | 7 | 8;
type SourceTier = 4 | 5 | 6 | 7;
type BandId = "blue" | "yellow" | "orange" | "red" | "black";

const WEAPON_FAMILIES = [
  ["sword", "broadsword"],
  ["bow", "longbow"],
  ["staff", "infernal"],
  ["gloves", "spiked_gauntlets"],
  ["dagger", "pair"],
] as const;

const BAND_BY_TIER: Readonly<Record<Tier, BandId>> = {
  4: "blue",
  5: "yellow",
  6: "orange",
  7: "red",
  8: "black",
};

const FINAL_ZONE_INDEX_BY_TIER: Readonly<Record<SourceTier, number>> = {
  4: 4,
  5: 4,
  6: 4,
  7: 4,
};

const FINAL_MASTERY_BY_TIER: Readonly<Record<SourceTier, number>> = {
  4: 30,
  5: 35,
  6: 50,
  7: 65,
};

const SOURCE_TIERS = [4, 5, 6, 7] as const satisfies readonly SourceTier[];
const FINAL_SEGMENT_INDEX = 9;
const PLATEAU_MIN_SEGMENTS = 3;

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

function shortWeaponName(itemId: string): string {
  return itemId.replace("item_weapon_", "").replace(/_t\d_/, " ");
}

function zoneName(zoneDefId: string): string {
  return ZONE_DEFINITIONS.find(({ id }) => String(id) === zoneDefId)?.name ?? zoneDefId;
}

function finalZoneId(tier: SourceTier) {
  const band = BAND_BY_TIER[tier];
  const zoneId = WORLD_ZONE_IDS_BY_BAND[band][FINAL_ZONE_INDEX_BY_TIER[tier]];
  if (zoneId === undefined) throw new Error(`Missing final zone for T${String(tier)}`);
  return zoneId;
}

function nextTierFirstZoneId(tier: SourceTier) {
  const nextTier = (tier + 1) as Tier;
  const band = BAND_BY_TIER[nextTier];
  const zoneId = WORLD_ZONE_IDS_BY_BAND[band][0];
  if (zoneId === undefined) throw new Error(`Missing first zone for T${String(nextTier)}`);
  return zoneId;
}

interface FinalGateRow {
  readonly transition: string;
  readonly zone: string;
  readonly weapon: string;
  readonly mastery: number;
  readonly tN2PotionClear: boolean;
  readonly tN2PotionHp: number;
  readonly tN3NoPotionClear: boolean;
  readonly tN3PotionClear: boolean;
  readonly tN3PotionHp: number;
  readonly tN3PotionsUsed: number;
}

interface PlateauRow {
  readonly transition: string;
  readonly zone: string;
  readonly weapon: string;
  readonly mastery: number;
  readonly firstWallNoPotion: string;
  readonly lastClearNoPotion: string;
  readonly firstWallPotion: string;
  readonly lastClearPotion: string;
  readonly clearsS1ToS3Potion: boolean;
  readonly clearsS10Potion: boolean;
}

function runFinalGate(sourceTier: SourceTier): readonly FinalGateRow[] {
  const zoneDefId = finalZoneId(sourceTier);
  const masteryLevel = FINAL_MASTERY_BY_TIER[sourceTier];

  return weaponItemIds(sourceTier).map((weaponItemId) => {
    const common = {
      weaponItemId,
      zoneDefId,
      segmentIndex: FINAL_SEGMENT_INDEX,
      equipmentItemIds: equipmentFor(weaponItemId, sourceTier),
      masteryLevel,
    } as const;

    const tN2Potion = runCombatRuntimeBenchmark({
      label: `transition_t${String(sourceTier)}_final_tn2_potion`,
      ...common,
      enchantment: 2,
      useHealthPotions: true,
    });
    const tN3NoPotion = runCombatRuntimeBenchmark({
      label: `transition_t${String(sourceTier)}_final_tn3_no_potion`,
      ...common,
      enchantment: 3,
      useHealthPotions: false,
    });
    const tN3Potion = runCombatRuntimeBenchmark({
      label: `transition_t${String(sourceTier)}_final_tn3_potion`,
      ...common,
      enchantment: 3,
      useHealthPotions: true,
    });

    return {
      transition: `T${String(sourceTier)}→T${String(sourceTier + 1)}`,
      zone: zoneName(String(zoneDefId)),
      weapon: shortWeaponName(weaponItemId),
      mastery: masteryLevel,
      tN2PotionClear: tN2Potion.clear,
      tN2PotionHp: tN2Potion.hpPercent,
      tN3NoPotionClear: tN3NoPotion.clear,
      tN3PotionClear: tN3Potion.clear,
      tN3PotionHp: tN3Potion.hpPercent,
      tN3PotionsUsed: tN3Potion.potionsUsed,
    };
  });
}

function runPlateau(sourceTier: SourceTier): readonly PlateauRow[] {
  const zoneDefId = nextTierFirstZoneId(sourceTier);
  const masteryLevel = FINAL_MASTERY_BY_TIER[sourceTier];

  return weaponItemIds(sourceTier).map((weaponItemId) => {
    const noPotionClears: boolean[] = [];
    const potionClears: boolean[] = [];

    for (let segmentIndex = 0; segmentIndex <= FINAL_SEGMENT_INDEX; segmentIndex += 1) {
      const common = {
        weaponItemId,
        zoneDefId,
        segmentIndex,
        equipmentItemIds: equipmentFor(weaponItemId, sourceTier),
        masteryLevel,
        enchantment: 3 as const,
      };
      noPotionClears.push(runCombatRuntimeBenchmark({
        label: `transition_t${String(sourceTier)}_plateau_s${String(segmentIndex + 1)}_no_potion`,
        ...common,
        useHealthPotions: false,
      }).clear);
      potionClears.push(runCombatRuntimeBenchmark({
        label: `transition_t${String(sourceTier)}_plateau_s${String(segmentIndex + 1)}_potion`,
        ...common,
        useHealthPotions: true,
      }).clear);
    }

    const firstWall = (rows: readonly boolean[]) => {
      const index = rows.findIndex((clear) => !clear);
      return index < 0 ? "-" : `S${String(index + 1)}`;
    };
    const lastClear = (rows: readonly boolean[]) => {
      let index = -1;
      rows.forEach((clear, current) => {
        if (clear) index = current;
      });
      return index < 0 ? "-" : `S${String(index + 1)}`;
    };

    return {
      transition: `T${String(sourceTier)}→T${String(sourceTier + 1)}`,
      zone: zoneName(String(zoneDefId)),
      weapon: shortWeaponName(weaponItemId),
      mastery: masteryLevel,
      firstWallNoPotion: firstWall(noPotionClears),
      lastClearNoPotion: lastClear(noPotionClears),
      firstWallPotion: firstWall(potionClears),
      lastClearPotion: lastClear(potionClears),
      clearsS1ToS3Potion: potionClears.slice(0, PLATEAU_MIN_SEGMENTS).every(Boolean),
      clearsS10Potion: potionClears[FINAL_SEGMENT_INDEX] ?? false,
    };
  });
}

const finalGateRows = SOURCE_TIERS.flatMap(runFinalGate);
const plateauRows = SOURCE_TIERS.flatMap(runPlateau);

console.log("[TIER_TRANSITION_FINAL_GATE]");
console.table(finalGateRows);

console.log("[TIER_TRANSITION_FARM_PLATEAU]");
console.table(plateauRows);

const summary = SOURCE_TIERS.map((sourceTier) => {
  const transition = `T${String(sourceTier)}→T${String(sourceTier + 1)}`;
  const gateRows = finalGateRows.filter((row) => row.transition === transition);
  const farmRows = plateauRows.filter((row) => row.transition === transition);
  const tN2PotionClears = gateRows.filter((row) => row.tN2PotionClear).length;
  const tN3PotionClears = gateRows.filter((row) => row.tN3PotionClear).length;
  const plateauPasses = farmRows.filter((row) => row.clearsS1ToS3Potion).length;
  const plateauS10Leaks = farmRows.filter((row) => row.clearsS10Potion).length;

  return {
    transition,
    finalZone: gateRows[0]?.zone ?? "-",
    tN2PotionClears: `${String(tN2PotionClears)}/5`,
    tN3PotionClears: `${String(tN3PotionClears)}/5`,
    nextZone: farmRows[0]?.zone ?? "-",
    plateauS1ToS3: `${String(plateauPasses)}/5`,
    plateauS10Leaks: `${String(plateauS10Leaks)}/5`,
    status: tN2PotionClears === 0
      && tN3PotionClears === 5
      && plateauPasses === 5
      && plateauS10Leaks === 0
      ? "PASS"
      : "FAIL",
  };
});

console.log("[TIER_TRANSITION_CONTRACT_SUMMARY]");
console.table(summary);
console.log("[TIER_TRANSITION_CONTRACT_JSON]", JSON.stringify({ finalGateRows, plateauRows, summary }, null, 2));
console.log("[TIER_TRANSITION_CONTRACT]", {
  finalGate: "Tn.2 + potion = 0/5 clears; Tn.3 + potion = 5/5 clears on final S10",
  farmPlateau: "Tn.3 + potion clears S1-S3 of the next tier first zone for 5/5 weapons, but clears S10 for 0/5",
});

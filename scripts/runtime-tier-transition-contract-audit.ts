import {
  getWorldProgressionTierContract,
  getWorldTierTransitionContract,
  type WorldProgressionSourceTier,
  type WorldProgressionTier,
} from "@game/data";
import { resolveEquipmentInfo } from "../apps/client/src/data/itemContentCatalog.js";
import { WORLD_ZONE_IDS_BY_BAND, ZONE_DEFINITIONS } from "../apps/client/src/data/worldContentCatalog.js";
import { runCombatRuntimeBenchmark } from "../apps/client/src/runtime/CombatRuntimeBenchmarkHarness.js";

const WEAPON_FAMILIES = [
  ["sword", "broadsword"],
  ["bow", "longbow"],
  ["staff", "infernal"],
  ["gloves", "spiked_gauntlets"],
  ["dagger", "pair"],
] as const;
const SOURCE_TIERS = [4, 5, 6, 7] as const satisfies readonly WorldProgressionSourceTier[];
const FINAL_SEGMENT_INDEX = 9;

function weaponItemIds(tier: WorldProgressionTier): readonly string[] {
  return WEAPON_FAMILIES.map(([family, specialization]) =>
    `item_weapon_${family}_t${String(tier)}_${specialization}`,
  );
}

function armorItemIds(tier: WorldProgressionTier): readonly string[] {
  return [
    `item_helmet_t${String(tier)}_reinforced`,
    `item_armor_t${String(tier)}_leather`,
    `item_boots_t${String(tier)}_leather`,
    "item_traveler_cape",
  ];
}

function equipmentFor(weaponItemId: string, tier: WorldProgressionTier): readonly string[] {
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

function zoneIdFor(tier: WorldProgressionTier, zoneIndex: number) {
  const band = getWorldProgressionTierContract(tier).band;
  const zoneId = WORLD_ZONE_IDS_BY_BAND[band][zoneIndex];
  if (zoneId === undefined) throw new Error(`Missing zone index ${String(zoneIndex)} for T${String(tier)}`);
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
  readonly clearsRequiredAfkPlateau: boolean;
  readonly clearsForbiddenLateSegmentWithPotion: boolean;
}

function runFinalGate(sourceTier: WorldProgressionSourceTier): readonly FinalGateRow[] {
  const contract = getWorldTierTransitionContract(sourceTier);
  const zoneDefId = zoneIdFor(sourceTier, contract.finalZoneIndex);
  return weaponItemIds(sourceTier).map((weaponItemId) => {
    const common = {
      weaponItemId,
      zoneDefId,
      segmentIndex: FINAL_SEGMENT_INDEX,
      equipmentItemIds: equipmentFor(weaponItemId, sourceTier),
      masteryLevel: contract.masteryLevel,
    } as const;
    const tN2Potion = runCombatRuntimeBenchmark({
      label: "tier_transition_blocked",
      ...common,
      enchantment: contract.blockedEnchantment,
      useHealthPotions: true,
    });
    const tN3NoPotion = runCombatRuntimeBenchmark({
      label: "tier_transition_required_no_potion",
      ...common,
      enchantment: contract.requiredEnchantment,
      useHealthPotions: false,
    });
    const tN3Potion = runCombatRuntimeBenchmark({
      label: "tier_transition_required_potion",
      ...common,
      enchantment: contract.requiredEnchantment,
      useHealthPotions: true,
    });
    return {
      transition: `T${String(sourceTier)}→T${String(sourceTier + 1)}`,
      zone: zoneName(String(zoneDefId)),
      weapon: shortWeaponName(weaponItemId),
      mastery: contract.masteryLevel,
      tN2PotionClear: tN2Potion.clear,
      tN2PotionHp: tN2Potion.hpPercent,
      tN3NoPotionClear: tN3NoPotion.clear,
      tN3PotionClear: tN3Potion.clear,
      tN3PotionHp: tN3Potion.hpPercent,
      tN3PotionsUsed: tN3Potion.potionsUsed,
    };
  });
}

function runPlateau(sourceTier: WorldProgressionSourceTier): readonly PlateauRow[] {
  const contract = getWorldTierTransitionContract(sourceTier);
  const nextTier = (sourceTier + 1) as WorldProgressionTier;
  const zoneDefId = zoneIdFor(nextTier, contract.nextTierFirstZoneIndex);

  return weaponItemIds(sourceTier).map((weaponItemId) => {
    const noPotionClears: boolean[] = [];
    const potionClears: boolean[] = [];
    for (let segmentIndex = 0; segmentIndex <= FINAL_SEGMENT_INDEX; segmentIndex += 1) {
      const common = {
        weaponItemId,
        zoneDefId,
        segmentIndex,
        equipmentItemIds: equipmentFor(weaponItemId, sourceTier),
        masteryLevel: contract.masteryLevel,
        enchantment: contract.requiredEnchantment,
      } as const;
      noPotionClears.push(runCombatRuntimeBenchmark({
        label: "tier_transition_plateau_no_potion",
        ...common,
        useHealthPotions: false,
      }).clear);
      potionClears.push(runCombatRuntimeBenchmark({
        label: "tier_transition_plateau_potion",
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
      rows.forEach((clear, current) => { if (clear) index = current; });
      return index < 0 ? "-" : `S${String(index + 1)}`;
    };

    return {
      transition: `T${String(sourceTier)}→T${String(sourceTier + 1)}`,
      zone: zoneName(String(zoneDefId)),
      weapon: shortWeaponName(weaponItemId),
      mastery: contract.masteryLevel,
      firstWallNoPotion: firstWall(noPotionClears),
      lastClearNoPotion: lastClear(noPotionClears),
      firstWallPotion: firstWall(potionClears),
      lastClearPotion: lastClear(potionClears),
      clearsRequiredAfkPlateau: noPotionClears.slice(0, contract.plateauMinSegments).every(Boolean),
      clearsForbiddenLateSegmentWithPotion: potionClears[contract.plateauMaxSegmentWithPotion] ?? false,
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
  const plateauPasses = farmRows.filter((row) => row.clearsRequiredAfkPlateau).length;
  const plateauLateLeaks = farmRows.filter((row) => row.clearsForbiddenLateSegmentWithPotion).length;

  return {
    transition,
    finalZone: gateRows[0]?.zone ?? "-",
    tN2PotionClears: `${String(tN2PotionClears)}/5`,
    tN3PotionClears: `${String(tN3PotionClears)}/5`,
    nextZone: farmRows[0]?.zone ?? "-",
    plateauAfkPasses: `${String(plateauPasses)}/5`,
    plateauPotionLateLeaks: `${String(plateauLateLeaks)}/5`,
    status: tN2PotionClears === 0
      && tN3PotionClears === 5
      && plateauPasses === 5
      && plateauLateLeaks === 0
      ? "PASS"
      : "FAIL",
  };
});

console.log("[TIER_TRANSITION_CONTRACT_SUMMARY]");
console.table(summary);
console.log("[TIER_TRANSITION_CONTRACT_JSON]", JSON.stringify({ finalGateRows, plateauRows, summary }, null, 2));
console.log("[TIER_TRANSITION_CONTRACT_SOURCE] @game/data WORLD_TIER_TRANSITION_CONTRACTS");
console.log("[TIER_TRANSITION_CONTRACT_RULES]", {
  finalGate: ".2 + potion fails; .3 + potion clears",
  plateau: "previous tier .3 farms S1-S3 without potion but cannot clear S10 even with potion",
});

import fs from "node:fs";
import path from "node:path";

import { getEncounterRewards } from "@game/gameplay";

import { resolveEquipmentInfo } from "../apps/client/src/data/itemContentCatalog.js";
import {
  resolveWeaponMastery,
} from "../apps/client/src/data/weaponContentCatalog.js";
import {
  resolveWeaponBalanceProfileByMasteryId,
} from "../apps/client/src/data/weaponBalanceProfileCatalog.js";
import {
  WORLD_ZONE_IDS_BY_BAND,
  ZONE_DEFINITIONS,
  getWorldZonePlacement,
} from "../apps/client/src/data/worldContentCatalog.js";
import {
  runCombatRuntimeBenchmark,
} from "../apps/client/src/runtime/CombatRuntimeBenchmarkHarness.js";

const MASTERY_LEVEL = 30;
const ENCHANTMENT = 2 as const;
const USE_HEALTH_POTIONS = true;

const T4_WEAPONS = [
  "item_weapon_sword_t4_broadsword",
  "item_weapon_bow_t4_longbow",
  "item_weapon_bow_t4_badon",
  "item_weapon_staff_t4_infernal",
  "item_weapon_gloves_t4_spiked_gauntlets",
  "item_weapon_dagger_t4_pair",
] as const;

const T4_ARMOR = [
  "item_helmet_t4_reinforced",
  "item_armor_t4_leather",
  "item_boots_t4_leather",
  "item_traveler_cape",
] as const;
const T4_SHIELD = "item_shield_t4_reinforced";

interface SweepRow {
  readonly weapon: string;
  readonly itemId: string;
  readonly gameplay: string;
  readonly primaryRole: string;
  readonly secondaryRole: string;
  readonly zone: string;
  readonly segment: number;
  readonly clear: boolean;
  readonly seconds: number;
  readonly avgEncounterSeconds: number | null;
  readonly hpPercent: number;
  readonly potions: number;
  readonly encountersReached: number;
  readonly fameEarned: number;
  readonly famePerHour: number;
  readonly observedDps: number;
  readonly damageDealt: number;
  readonly damageReceived: number;
}

function shortWeaponName(itemId: string): string {
  return itemId.replace("item_weapon_", "").replace("_t4_", " ");
}

function zoneName(zoneDefId: (typeof WORLD_ZONE_IDS_BY_BAND.blue)[number]): string {
  return ZONE_DEFINITIONS.find(({ id }) => id === zoneDefId)?.name ?? String(zoneDefId);
}

function equipmentFor(weaponItemId: string): readonly string[] {
  const items = [...T4_ARMOR];
  if (resolveEquipmentInfo(weaponItemId)?.handling === "one_handed") items.push(T4_SHIELD);
  return items;
}

function completedEncounters(clear: boolean, encountersReached: number): number {
  return clear ? 5 : Math.max(0, Math.min(4, encountersReached - 1));
}

function fameEarnedForRun(
  zoneDefId: (typeof WORLD_ZONE_IDS_BY_BAND.blue)[number],
  segmentIndex: number,
  completed: number,
): number {
  const placement = getWorldZonePlacement(zoneDefId);
  let fame = 0;
  for (let encounterIndex = 0; encounterIndex < completed; encounterIndex += 1) {
    fame += getEncounterRewards(
      placement.zoneIndexWithinBand,
      segmentIndex,
      encounterIndex,
      placement.bandId,
    ).fame;
  }
  return fame;
}

function buildRows(): readonly SweepRow[] {
  const rows: SweepRow[] = [];

  for (const weaponItemId of T4_WEAPONS) {
    const mastery = resolveWeaponMastery(weaponItemId);
    if (mastery === undefined) throw new Error(`Missing mastery route for ${weaponItemId}`);
    const profile = resolveWeaponBalanceProfileByMasteryId(String(mastery.weaponId));
    if (profile === undefined) throw new Error(`Missing balance profile for ${weaponItemId}`);

    for (const zoneDefId of WORLD_ZONE_IDS_BY_BAND.blue) {
      for (let segmentIndex = 0; segmentIndex < 10; segmentIndex += 1) {
        const result = runCombatRuntimeBenchmark({
          label: `${String(zoneDefId)}_s${String(segmentIndex + 1)}`,
          weaponItemId,
          zoneDefId,
          segmentIndex,
          equipmentItemIds: equipmentFor(weaponItemId),
          enchantment: ENCHANTMENT,
          masteryLevel: MASTERY_LEVEL,
          useHealthPotions: USE_HEALTH_POTIONS,
        });
        const completed = completedEncounters(result.clear, result.encounterReached);
        const fameEarned = fameEarnedForRun(zoneDefId, segmentIndex, completed);
        const famePerHour = result.seconds > 0 ? Math.round((fameEarned / result.seconds) * 3600) : 0;

        rows.push({
          weapon: shortWeaponName(weaponItemId),
          itemId: weaponItemId,
          gameplay: profile.gameplayProfile,
          primaryRole: profile.primaryContentRole,
          secondaryRole: profile.secondaryContentRole ?? "-",
          zone: zoneName(zoneDefId),
          segment: segmentIndex + 1,
          clear: result.clear,
          seconds: result.seconds,
          avgEncounterSeconds: result.clear ? Number((result.seconds / 5).toFixed(2)) : null,
          hpPercent: result.hpPercent,
          potions: result.potionsUsed,
          encountersReached: result.encounterReached,
          fameEarned,
          famePerHour,
          observedDps: result.observedDps,
          damageDealt: result.damageDealt,
          damageReceived: result.damageReceived,
        });
      }
    }
  }

  return rows;
}

function main(): void {
  const rows = buildRows();
  const representativeSegments = new Set([1, 5, 10]);

  console.log("[WEAPON_ROLE_WORLD_SWEEP_REFERENCE]", {
    masteryLevel: MASTERY_LEVEL,
    enchantment: ENCHANTMENT,
    fullT4Armor: true,
    healthPotions: USE_HEALTH_POTIONS,
  });

  console.log("[WEAPON_ROLE_WORLD_SWEEP_CHECKPOINTS]");
  console.table(rows.filter((row) => representativeSegments.has(row.segment)).map((row) => ({
    weapon: row.weapon,
    role: row.primaryRole,
    zone: row.zone,
    segment: row.segment,
    clear: row.clear,
    seconds: row.seconds,
    hp: row.hpPercent,
    potions: row.potions,
    fameH: row.famePerHour,
    dps: row.observedDps,
  })));

  const summaries = T4_WEAPONS.map((weaponItemId) => {
    const weaponRows = rows.filter((row) => row.itemId === weaponItemId);
    const firstWall = weaponRows.find((row) => !row.clear);
    const cleared = weaponRows.filter((row) => row.clear);
    const deepest = cleared[cleared.length - 1];
    const bestFarm = [...cleared].sort((a, b) => b.famePerHour - a.famePerHour)[0];
    const bossBoundaries = cleared.filter((row) => row.segment === 10);
    const avgBossBoundarySeconds = bossBoundaries.length > 0
      ? Number((bossBoundaries.reduce((sum, row) => sum + row.seconds, 0) / bossBoundaries.length).toFixed(1))
      : null;
    const sample = weaponRows[0];

    return {
      weapon: shortWeaponName(weaponItemId),
      role: sample?.primaryRole ?? "-",
      gameplay: sample?.gameplay ?? "-",
      clears: cleared.length,
      deepestClear: deepest === undefined ? "none" : `${deepest.zone} S${String(deepest.segment)}`,
      firstWall: firstWall === undefined ? "none" : `${firstWall.zone} S${String(firstWall.segment)}`,
      bestFameH: bestFarm?.famePerHour ?? 0,
      bestFarmLocation: bestFarm === undefined ? "none" : `${bestFarm.zone} S${String(bestFarm.segment)}`,
      avgBossBoundarySeconds,
      totalPotionsOnClears: cleared.reduce((sum, row) => sum + row.potions, 0),
    };
  });

  console.log("[WEAPON_ROLE_WORLD_SWEEP_SUMMARY]");
  console.table(summaries);

  const outputDir = path.resolve(process.cwd(), "runtime-artifacts");
  fs.mkdirSync(outputDir, { recursive: true });
  const outputPath = path.join(outputDir, "weapon-role-world-sweep.json");
  fs.writeFileSync(outputPath, JSON.stringify({
    reference: {
      masteryLevel: MASTERY_LEVEL,
      enchantment: ENCHANTMENT,
      fullT4Armor: true,
      healthPotions: USE_HEALTH_POTIONS,
    },
    summaries,
    rows,
  }, null, 2));
  console.log(`[WEAPON_ROLE_WORLD_SWEEP_JSON] ${outputPath}`);
}

main();

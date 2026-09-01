import { FACTION_ARTIFACT_DAMAGE_BONUS_PERCENT_BY_TIER } from "@game/data";
import {
  ARTIFACT_WEAPON_BENCHMARK_SPECS,
  artifactBenchmarkMasteryProfile,
  type ArtifactBenchmarkTier,
} from "../apps/client/src/data/artifactWeaponBenchmarkFixtures.js";
import { resolveEquipmentInfo } from "../apps/client/src/data/itemContentCatalog.js";
import { DUNGEON_DEFINITIONS } from "../apps/client/src/data/dungeonContentCatalog.js";
import { resolveArtifactDungeonDamageBonusPercent } from "../apps/client/src/data/weaponContentCatalog.js";
import { WORLD_ZONE_IDS } from "../apps/client/src/data/worldContentCatalog.js";
import { runCombatRuntimeBenchmark } from "../apps/client/src/runtime/CombatRuntimeBenchmarkHarness.js";

const TIERS = [4, 5, 6, 7, 8] as const satisfies readonly ArtifactBenchmarkTier[];
const ENCHANTMENT = 3 as const;
const POTION_CAP = 2;
const ZONE_DEF_ID = WORLD_ZONE_IDS.mountain;
const SEGMENT_INDEX = 9;

const BASE_WEAPON_SPECS = [
  { family: "Sword", label: "Broadsword", itemId: (tier: ArtifactBenchmarkTier) => `item_weapon_sword_t${tier}_broadsword` },
  { family: "Bow", label: "Longbow", itemId: (tier: ArtifactBenchmarkTier) => `item_weapon_bow_t${tier}_longbow` },
  { family: "Fire", label: "Infernal Staff", itemId: (tier: ArtifactBenchmarkTier) => `item_weapon_staff_t${tier}_infernal` },
  { family: "Gloves", label: "Spiked Gauntlets", itemId: (tier: ArtifactBenchmarkTier) => `item_weapon_gloves_t${tier}_spiked_gauntlets` },
  { family: "Dagger", label: "Dagger Pair", itemId: (tier: ArtifactBenchmarkTier) => `item_weapon_dagger_t${tier}_pair` },
] as const;

function masteryProfile(tier: ArtifactBenchmarkTier) {
  if (tier === 4) {
    return {
      familyMasteryLevel: 40,
      specializationMasteryLevel: 40,
      siblingSpecializationMasteryLevel: 0,
    } as const;
  }
  return artifactBenchmarkMasteryProfile(tier);
}

function equipmentFor(weaponItemId: string, tier: ArtifactBenchmarkTier, faction: string): readonly string[] {
  const items: string[] = [
    `item_helmet_t${tier}_reinforced`,
    `item_armor_t${tier}_leather`,
    `item_boots_t${tier}_leather`,
    `item_cape_t${tier}_${faction.toLowerCase()}`,
  ];
  if (resolveEquipmentInfo(weaponItemId)?.handling === "one_handed") {
    items.push(`item_shield_t${tier}_reinforced`);
  }
  return items;
}

function runDungeon(input: {
  readonly tier: ArtifactBenchmarkTier;
  readonly label: string;
  readonly weaponItemId: string;
  readonly dungeonDefinitionId: string;
  readonly faction: string;
  readonly heroDamageMultiplier?: number;
}) {
  const mastery = masteryProfile(input.tier);
  return runCombatRuntimeBenchmark({
    label: input.label,
    weaponItemId: input.weaponItemId,
    equipmentItemIds: equipmentFor(input.weaponItemId, input.tier, input.faction),
    zoneDefId: ZONE_DEF_ID,
    segmentIndex: SEGMENT_INDEX,
    dungeonDefinitionId: input.dungeonDefinitionId,
    enchantment: ENCHANTMENT,
    familyMasteryLevel: mastery.familyMasteryLevel,
    specializationMasteryLevel: mastery.specializationMasteryLevel,
    siblingSpecializationMasteryLevel: mastery.siblingSpecializationMasteryLevel,
    useHealthPotions: true,
    healthPotionQuantity: POTION_CAP,
    ...(input.heroDamageMultiplier === undefined ? {} : { heroDamageMultiplier: input.heroDamageMultiplier }),
  });
}

function summarize(result: ReturnType<typeof runCombatRuntimeBenchmark>) {
  const failedEncounter = result.encounters.find((encounter) => !encounter.cleared);
  return {
    clear: result.clear,
    seconds: result.seconds,
    hpPct: result.hpPercent,
    potions: result.potionsUsed,
    withinTwoPotionCap: result.potionsUsed <= POTION_CAP,
    encounterReached: result.encounterReached,
    bossProgressPct: result.bossProgressPercent,
    failedEncounter: failedEncounter?.encounterIndex ?? null,
    failedEncounterProgressPct: failedEncounter?.encounterProgressPercent ?? 100,
    dps: result.observedDps,
    incomingDps: result.incomingDps,
  };
}

for (const tier of TIERS) {
  const dungeons = DUNGEON_DEFINITIONS.filter((dungeon) => dungeon.tier === tier);
  const mastery = masteryProfile(tier);

  console.log(`[DUNGEON_T${tier}_REFERENCE]`, {
    tier,
    enchantment: ENCHANTMENT,
    familyMastery: mastery.familyMasteryLevel,
    specializationMastery: mastery.specializationMasteryLevel,
    siblingMastery: mastery.siblingSpecializationMasteryLevel,
    matchingCape: true,
    potionCap: POTION_CAP,
    favorableFactionBonusPct: FACTION_ARTIFACT_DAMAGE_BONUS_PERCENT_BY_TIER[tier] ?? 0,
  });

  const baseRows = dungeons.flatMap((dungeon) => BASE_WEAPON_SPECS.map((weapon) => ({
    tier,
    dungeon: dungeon.id,
    faction: dungeon.faction,
    family: weapon.family,
    weapon: weapon.label,
    ...summarize(runDungeon({
      tier,
      label: `${dungeon.id}_base_${weapon.family.toLowerCase()}`,
      weaponItemId: weapon.itemId(tier),
      dungeonDefinitionId: dungeon.id,
      faction: dungeon.faction,
    })),
  })));

  console.log(`[DUNGEON_T${tier}_BASE_MATRIX]`);
  console.table(baseRows);

  const baseSummary = dungeons.map((dungeon) => {
    const rows = baseRows.filter((row) => row.dungeon === dungeon.id);
    const clears = rows.filter((row) => row.clear && row.withinTwoPotionCap);
    const failures = rows.filter((row) => !row.clear && row.withinTwoPotionCap);
    return {
      dungeon: dungeon.id,
      faction: dungeon.faction,
      clearCount: `${String(clears.length)}/${String(BASE_WEAPON_SPECS.length)}`,
      minClearHpPct: clears.length > 0 ? Math.min(...clears.map((row) => row.hpPct)) : null,
      maxClearHpPct: clears.length > 0 ? Math.max(...clears.map((row) => row.hpPct)) : null,
      closestFailBossPct: failures.length > 0 ? Math.max(...failures.map((row) => row.bossProgressPct)) : null,
      maxPotionsUsed: rows.length > 0 ? Math.max(...rows.map((row) => row.potions)) : null,
    };
  });

  console.log(`[DUNGEON_T${tier}_BASE_SUMMARY]`);
  console.table(baseSummary);

  const favorableRows = dungeons.flatMap((dungeon) => ARTIFACT_WEAPON_BENCHMARK_SPECS
    .map((weapon) => ({
      weapon,
      itemId: weapon.itemId(tier),
      bonusPct: resolveArtifactDungeonDamageBonusPercent(weapon.itemId(tier), dungeon.faction),
    }))
    .filter(({ bonusPct }) => bonusPct > 0)
    .map(({ weapon, itemId, bonusPct }) => ({
      tier,
      dungeon: dungeon.id,
      faction: dungeon.faction,
      family: weapon.family,
      weapon: weapon.label,
      bonusPct,
      ...summarize(runDungeon({
        tier,
        label: `${dungeon.id}_counter_${weapon.family}`,
        weaponItemId: itemId,
        dungeonDefinitionId: dungeon.id,
        faction: dungeon.faction,
        heroDamageMultiplier: 1 + bonusPct / 100,
      })),
    })));

  console.log(`[DUNGEON_T${tier}_COUNTER_FACTION_MATRIX]`);
  console.table(favorableRows);

  const favorableSummary = dungeons.map((dungeon) => {
    const rows = favorableRows.filter((row) => row.dungeon === dungeon.id);
    const clears = rows.filter((row) => row.clear && row.withinTwoPotionCap);
    const failures = rows.filter((row) => !row.clear && row.withinTwoPotionCap);
    return {
      dungeon: dungeon.id,
      faction: dungeon.faction,
      counterWeapons: rows.length,
      clearCount: `${String(clears.length)}/${String(rows.length)}`,
      minClearHpPct: clears.length > 0 ? Math.min(...clears.map((row) => row.hpPct)) : null,
      maxClearHpPct: clears.length > 0 ? Math.max(...clears.map((row) => row.hpPct)) : null,
      closestFailBossPct: failures.length > 0 ? Math.max(...failures.map((row) => row.bossProgressPct)) : null,
      maxPotionsUsed: rows.length > 0 ? Math.max(...rows.map((row) => row.potions)) : null,
    };
  });

  console.log(`[DUNGEON_T${tier}_COUNTER_FACTION_SUMMARY]`);
  console.table(favorableSummary);
}

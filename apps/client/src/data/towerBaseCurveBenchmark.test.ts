import { describe, expect, it } from "vitest";
import { getTowerDepthDifficultyMultiplier, type TowerFactionId, type TowerTier } from "@game/data";
import { runCombatRuntimeBenchmark } from "../runtime/CombatRuntimeBenchmarkHarness.js";
import {
  ARTIFACT_WEAPON_BENCHMARK_SPECS,
  artifactBenchmarkMasteryProfile,
  artifactDungeonEquipment,
} from "./artifactWeaponBenchmarkFixtures.js";
import { DUNGEON_DEFINITIONS } from "./dungeonContentCatalog.js";
import { resolveFactionCapeDungeonDamageReductionPercent } from "./factionCapeContentCatalog.js";
import { resolveTowerEncounter } from "./towerEncounterResolver.js";
import { resolveArtifactDungeonDamageBonusPercent } from "./weaponContentCatalog.js";
import { WORLD_ZONE_IDS } from "./worldContentCatalog.js";

const TOWER_BENCHMARK_SEED = "tower-base-curve-all-tier-factions";
const TOWER_TIERS = [4, 5, 6, 7, 8] as const satisfies readonly TowerTier[];
const TOWER_FACTIONS = ["keeper", "heretic", "undead", "morgana"] as const satisfies readonly TowerFactionId[];
const TOWER_WEAPON_ENCHANTMENT = 4 as const;
const TOWER_EQUIPMENT_ENCHANTMENT = 3 as const;
const TOWER_POTION_STOCK = 99;
const TOWER_EARLY_AWAKENING_STRAIN = 10;
// At strain 10, slot 2 has just unlocked. A player can realistically have one
// trait filled + nine improvements. Item Power rolls 1-2 per modification, so
// 15 IP is the midpoint of the non-critical 10-modification reachable range 10-20.
const TOWER_EARLY_AWAKENING_ITEM_POWER = 15;
const ENDLESS_SCAN_MAX_FLOOR = 10_000;

const round1 = (value: number): number => Number(value.toFixed(1));

function neutralizeDepthScaling(profile: {
  readonly hp: number;
  readonly damage: number;
  readonly attackSpeed: number;
  readonly armor: number;
  readonly magicResistance: number;
}, floor: number) {
  const multiplier = getTowerDepthDifficultyMultiplier(floor);
  return {
    hp: Math.round(profile.hp / multiplier),
    damage: Math.round(profile.damage / multiplier),
    attackSpeed: profile.attackSpeed,
    armor: Math.round(profile.armor / multiplier),
    magicResistance: Math.round(profile.magicResistance / multiplier),
  };
}

function findCanonicalEndlessBaseBlocks() {
  const wanted = new Set(
    TOWER_TIERS.flatMap((tier) => TOWER_FACTIONS.map((faction) => `${String(tier)}:${faction}`)),
  );
  const found = new Map<string, {
    startFloor: number;
    tier: TowerTier;
    factionId: TowerFactionId;
    dungeonDefinitionId: string;
    authoredEncounters: readonly {
      monsterDefinitionId: string;
      profile: {
        hp: number;
        damage: number;
        attackSpeed: number;
        armor: number;
        magicResistance: number;
      };
    }[];
  }>();

  for (let startFloor = 26; startFloor <= ENDLESS_SCAN_MAX_FLOOR && found.size < wanted.size; startFloor += 5) {
    const first = resolveTowerEncounter(startFloor, TOWER_BENCHMARK_SEED);
    const { tier, factionId } = first.floorDefinition.block;
    const key = `${String(tier)}:${factionId}`;
    if (!wanted.has(key) || found.has(key)) continue;

    const blockId = first.floorDefinition.block.id;
    const encounters = Array.from({ length: 5 }, (_, offset) => (
      resolveTowerEncounter(startFloor + offset, TOWER_BENCHMARK_SEED)
    ));
    if (!encounters.every((encounter) => encounter.floorDefinition.block.id === blockId)) {
      throw new Error(`Tower block ${blockId} crosses a five-floor boundary`);
    }

    found.set(key, {
      startFloor,
      tier,
      factionId,
      dungeonDefinitionId: first.dungeonDefinitionId,
      authoredEncounters: encounters.map((encounter) => ({
        monsterDefinitionId: encounter.monsterDefinitionId,
        profile: neutralizeDepthScaling(encounter.combatProfile, encounter.floorDefinition.floor),
      })),
    });
  }

  return { wanted, found };
}

describe("Tower base curve benchmark", () => {
  it("benchmarks every favorable weapon across every tier and faction at depth x1", () => {
    const { wanted, found } = findCanonicalEndlessBaseBlocks();
    const missing = [...wanted].filter((key) => !found.has(key));
    expect(missing, `Missing canonical Endless combinations: ${missing.join(", ")}`).toEqual([]);

    const rows = [...found.values()]
      .sort((a, b) => a.tier - b.tier || a.factionId.localeCompare(b.factionId))
      .flatMap(({ startFloor, tier, factionId, dungeonDefinitionId, authoredEncounters }) => {
        const dungeon = DUNGEON_DEFINITIONS.find((definition) => definition.id === dungeonDefinitionId);
        if (dungeon === undefined) throw new Error(`Missing Dungeon source ${dungeonDefinitionId}`);

        const mastery = artifactBenchmarkMasteryProfile(tier);
        const capeItemId = `item_cape_t${String(tier)}_${factionId}`;
        const incomingDamageReductionPercent = resolveFactionCapeDungeonDamageReductionPercent(
          capeItemId,
          { factionId, tier },
        );

        return ARTIFACT_WEAPON_BENCHMARK_SPECS.flatMap((weapon) => {
          const weaponItemId = weapon.itemId(tier);
          const bonusPct = resolveArtifactDungeonDamageBonusPercent(weaponItemId, dungeon.faction);
          if (bonusPct <= 0) return [];

          const result = runCombatRuntimeBenchmark({
            label: `tower_base_t${String(tier)}_${factionId}_${weapon.family}_${weapon.label}`,
            weaponItemId,
            equipmentItemIds: artifactDungeonEquipment(weaponItemId, tier, factionId),
            zoneDefId: WORLD_ZONE_IDS.mountain,
            segmentIndex: 9,
            authoredEncounters,
            enchantment: TOWER_WEAPON_ENCHANTMENT,
            equipmentEnchantment: TOWER_EQUIPMENT_ENCHANTMENT,
            awakenedWeapon: {
              strain: TOWER_EARLY_AWAKENING_STRAIN,
              traits: [{ traitId: "item_power", value: TOWER_EARLY_AWAKENING_ITEM_POWER }],
            },
            familyMasteryLevel: mastery.familyMasteryLevel,
            specializationMasteryLevel: mastery.specializationMasteryLevel,
            siblingSpecializationMasteryLevel: mastery.siblingSpecializationMasteryLevel,
            useHealthPotions: true,
            healthPotionQuantity: TOWER_POTION_STOCK,
            heroDamageMultiplier: 1 + bonusPct / 100,
            incomingDamageReductionPercent,
          });
          const failedEncounter = result.encounters.find((encounter) => !encounter.cleared);

          return [{
            tier,
            faction: factionId,
            sourceFloor: startFloor,
            family: weapon.family,
            weapon: weapon.label,
            bonusPct,
            strain: TOWER_EARLY_AWAKENING_STRAIN,
            awakenedItemPower: TOWER_EARLY_AWAKENING_ITEM_POWER,
            clear: result.clear,
            hpPct: round1(result.hpPercent),
            seconds: round1(result.seconds),
            potions: result.potionsUsed,
            encounterReached: result.encounterReached,
            failedFloorInBlock: failedEncounter?.encounterIndex ?? null,
            failedFloorProgressPct: failedEncounter === undefined
              ? 100
              : round1(failedEncounter.encounterProgressPercent),
            enemyHpRemainingPct: round1(result.enemyHpRemainingPercent),
          }];
        });
      });

    const summary = TOWER_TIERS.flatMap((tier) => TOWER_FACTIONS.map((faction) => {
      const factionRows = rows.filter((row) => row.tier === tier && row.faction === faction);
      const clears = factionRows.filter((row) => row.clear);
      return {
        tier,
        faction,
        favorableWeapons: factionRows.length,
        clears: `${String(clears.length)}/${String(factionRows.length)}`,
        minClearHpPct: clears.length === 0 ? null : Math.min(...clears.map((row) => row.hpPct)),
        maxClearHpPct: clears.length === 0 ? null : Math.max(...clears.map((row) => row.hpPct)),
        maxPotionsUsed: factionRows.length === 0 ? null : Math.max(...factionRows.map((row) => row.potions)),
      };
    }));

    console.log("[TOWER_BASE_CURVE_ALL_FACTIONS_REFERENCE]", {
      encounterSource: "canonical Endless resolveTowerEncounter; depth multiplier divided back to x1",
      weaponEnchantment: TOWER_WEAPON_ENCHANTMENT,
      equipmentEnchantment: TOWER_EQUIPMENT_ENCHANTMENT,
      awakenedStrain: TOWER_EARLY_AWAKENING_STRAIN,
      awakenedTraits: [{ traitId: "item_power", value: TOWER_EARLY_AWAKENING_ITEM_POWER }],
      awakeningRationale: "strain 10 = one filled trait plus nine improvements; 15 IP is midpoint of reachable 10-20 non-critical range",
      potionStock: TOWER_POTION_STOCK,
      potionPolicy: "shared CombatRuntime threshold/cooldown; no Tower-specific cap",
      favorableMatchupsOnly: true,
    });
    console.log("[TOWER_BASE_CURVE_ALL_FACTIONS_SUMMARY]");
    console.table(summary);
    console.log("[TOWER_BASE_CURVE_ALL_FACTIONS_MATRIX]");
    console.table(rows);
    console.log("[TOWER_BASE_CURVE_ALL_FACTIONS_FAILURES]");
    console.table(rows.filter((row) => !row.clear));

    expect(summary).toHaveLength(20);
    expect(rows).toHaveLength(100);
    expect(summary.every((entry) => entry.favorableWeapons === 5)).toBe(true);
  });
});

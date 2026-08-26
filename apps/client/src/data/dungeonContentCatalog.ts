import { getEnemyCombatProfile, type DungeonDefinition } from "@game/gameplay";
import type { WorldBandId } from "@game/data";
import { getDungeonKeyItemId } from "./dungeonKeyContentCatalog.js";
import { MONSTER_IDS } from "./monsterContentCatalog.js";
import type { AuthoredEnemyCombatProfile } from "../runtime/combatEntityFactory.js";

export const FACTION_T4_COMBAT_PROFILE_ID = "dungeon_combat_faction_t4";
export const FACTION_T5_COMBAT_PROFILE_ID = "dungeon_combat_faction_t5";
export const FACTION_T6_COMBAT_PROFILE_ID = "dungeon_combat_faction_t6";
export const FACTION_T7_COMBAT_PROFILE_ID = "dungeon_combat_faction_t7";
export const FACTION_T8_COMBAT_PROFILE_ID = "dungeon_combat_faction_t8";

export const KEEPER_T4_DUNGEON_ID = "dungeon_keeper_t4";
export const HERETIC_T4_DUNGEON_ID = "dungeon_heretic_t4";
export const UNDEAD_T4_DUNGEON_ID = "dungeon_undead_t4";
export const MORGANA_T4_DUNGEON_ID = "dungeon_morgana_t4";
export const KEEPER_T5_DUNGEON_ID = "dungeon_keeper_t5";
export const HERETIC_T5_DUNGEON_ID = "dungeon_heretic_t5";
export const UNDEAD_T5_DUNGEON_ID = "dungeon_undead_t5";
export const MORGANA_T5_DUNGEON_ID = "dungeon_morgana_t5";
export const KEEPER_T6_DUNGEON_ID = "dungeon_keeper_t6";
export const HERETIC_T6_DUNGEON_ID = "dungeon_heretic_t6";
export const UNDEAD_T6_DUNGEON_ID = "dungeon_undead_t6";
export const MORGANA_T6_DUNGEON_ID = "dungeon_morgana_t6";
export const KEEPER_T7_DUNGEON_ID = "dungeon_keeper_t7";
export const HERETIC_T7_DUNGEON_ID = "dungeon_heretic_t7";
export const UNDEAD_T7_DUNGEON_ID = "dungeon_undead_t7";
export const MORGANA_T7_DUNGEON_ID = "dungeon_morgana_t7";
export const KEEPER_T8_DUNGEON_ID = "dungeon_keeper_t8";
export const HERETIC_T8_DUNGEON_ID = "dungeon_heretic_t8";
export const UNDEAD_T8_DUNGEON_ID = "dungeon_undead_t8";
export const MORGANA_T8_DUNGEON_ID = "dungeon_morgana_t8";

export const KEEPER_T4_LOOT_TABLE_ID = "dungeon_loot_keeper_t4";
export const HERETIC_T4_LOOT_TABLE_ID = "dungeon_loot_heretic_t4";
export const UNDEAD_T4_LOOT_TABLE_ID = "dungeon_loot_undead_t4";
export const MORGANA_T4_LOOT_TABLE_ID = "dungeon_loot_morgana_t4";
export const KEEPER_T5_LOOT_TABLE_ID = "dungeon_loot_keeper_t5";
export const HERETIC_T5_LOOT_TABLE_ID = "dungeon_loot_heretic_t5";
export const UNDEAD_T5_LOOT_TABLE_ID = "dungeon_loot_undead_t5";
export const MORGANA_T5_LOOT_TABLE_ID = "dungeon_loot_morgana_t5";
export const KEEPER_T6_LOOT_TABLE_ID = "dungeon_loot_keeper_t6";
export const HERETIC_T6_LOOT_TABLE_ID = "dungeon_loot_heretic_t6";
export const UNDEAD_T6_LOOT_TABLE_ID = "dungeon_loot_undead_t6";
export const MORGANA_T6_LOOT_TABLE_ID = "dungeon_loot_morgana_t6";
export const KEEPER_T7_LOOT_TABLE_ID = "dungeon_loot_keeper_t7";
export const HERETIC_T7_LOOT_TABLE_ID = "dungeon_loot_heretic_t7";
export const UNDEAD_T7_LOOT_TABLE_ID = "dungeon_loot_undead_t7";
export const MORGANA_T7_LOOT_TABLE_ID = "dungeon_loot_morgana_t7";
export const KEEPER_T8_LOOT_TABLE_ID = "dungeon_loot_keeper_t8";
export const HERETIC_T8_LOOT_TABLE_ID = "dungeon_loot_heretic_t8";
export const UNDEAD_T8_LOOT_TABLE_ID = "dungeon_loot_undead_t8";
export const MORGANA_T8_LOOT_TABLE_ID = "dungeon_loot_morgana_t8";

/** @deprecated T4 faction dungeons share the same world-source profile. */
export const KEEPER_T4_COMBAT_PROFILE_ID = FACTION_T4_COMBAT_PROFILE_ID;

type AuthoredDungeonTier = 4 | 5 | 6 | 7 | 8;

interface DungeonCombatSourceDefinition {
  readonly id: string;
  readonly bandId: WorldBandId;
  readonly sourceZoneIndexWithinBand: number;
}

interface DungeonEncounterBalanceStep {
  readonly sourceSegmentIndex: number;
  readonly sourceEncounterIndex: number;
  readonly hp: number;
  readonly damage: number;
  readonly defense: number;
}

const DUNGEON_COMBAT_SOURCES: Readonly<Record<string, DungeonCombatSourceDefinition>> = {
  [FACTION_T4_COMBAT_PROFILE_ID]: { id: FACTION_T4_COMBAT_PROFILE_ID, bandId: "blue", sourceZoneIndexWithinBand: 4 },
  [FACTION_T5_COMBAT_PROFILE_ID]: { id: FACTION_T5_COMBAT_PROFILE_ID, bandId: "yellow", sourceZoneIndexWithinBand: 4 },
  [FACTION_T6_COMBAT_PROFILE_ID]: { id: FACTION_T6_COMBAT_PROFILE_ID, bandId: "orange", sourceZoneIndexWithinBand: 4 },
  [FACTION_T7_COMBAT_PROFILE_ID]: { id: FACTION_T7_COMBAT_PROFILE_ID, bandId: "red", sourceZoneIndexWithinBand: 4 },
  [FACTION_T8_COMBAT_PROFILE_ID]: { id: FACTION_T8_COMBAT_PROFILE_ID, bandId: "black", sourceZoneIndexWithinBand: 4 },
};

/**
 * Final authored dungeon balance. Each value is applied exactly once to the referenced world encounter.
 * There are intentionally no later per-dungeon or boss correction multipliers.
 */
const DUNGEON_ENCOUNTER_BALANCE_BY_ID: Readonly<Record<string, readonly DungeonEncounterBalanceStep[]>> = {
  [KEEPER_T4_DUNGEON_ID]: [
    { sourceSegmentIndex: 9, sourceEncounterIndex: 0, hp: 0.8925, damage: 0.8925, defense: 0.969 },
    { sourceSegmentIndex: 9, sourceEncounterIndex: 1, hp: 0.918, damage: 0.918, defense: 0.988 },
    { sourceSegmentIndex: 8, sourceEncounterIndex: 4, hp: 0.935, damage: 0.935, defense: 1.007 },
    { sourceSegmentIndex: 9, sourceEncounterIndex: 4, hp: 0.9775, damage: 0.9775, defense: 1.045 },
  ],
  [HERETIC_T4_DUNGEON_ID]: [
    { sourceSegmentIndex: 9, sourceEncounterIndex: 0, hp: 1.05, damage: 1.134, defense: 1.02 },
    { sourceSegmentIndex: 9, sourceEncounterIndex: 1, hp: 1.08, damage: 1.1664, defense: 1.04 },
    { sourceSegmentIndex: 8, sourceEncounterIndex: 4, hp: 1.1, damage: 1.188, defense: 1.06 },
    { sourceSegmentIndex: 9, sourceEncounterIndex: 4, hp: 0.828, damage: 1.242, defense: 1.1 },
  ],
  [UNDEAD_T4_DUNGEON_ID]: [
    { sourceSegmentIndex: 9, sourceEncounterIndex: 0, hp: 1.05, damage: 1.05, defense: 1.02 },
    { sourceSegmentIndex: 9, sourceEncounterIndex: 1, hp: 1.08, damage: 1.08, defense: 1.04 },
    { sourceSegmentIndex: 8, sourceEncounterIndex: 4, hp: 1.1, damage: 1.1, defense: 1.06 },
    { sourceSegmentIndex: 9, sourceEncounterIndex: 4, hp: 0.7705, damage: 1.15, defense: 1.1 },
  ],
  [MORGANA_T4_DUNGEON_ID]: [
    { sourceSegmentIndex: 9, sourceEncounterIndex: 0, hp: 1.05, damage: 1.05, defense: 1.02 },
    { sourceSegmentIndex: 9, sourceEncounterIndex: 1, hp: 1.08, damage: 1.08, defense: 1.04 },
    { sourceSegmentIndex: 8, sourceEncounterIndex: 4, hp: 1.1, damage: 1.1, defense: 1.06 },
    { sourceSegmentIndex: 9, sourceEncounterIndex: 4, hp: 0.759, damage: 1.15, defense: 1.1 },
  ],
  [KEEPER_T5_DUNGEON_ID]: [
    { sourceSegmentIndex: 9, sourceEncounterIndex: 0, hp: 1.05, damage: 1.05, defense: 1.02 },
    { sourceSegmentIndex: 9, sourceEncounterIndex: 1, hp: 1.08, damage: 1.08, defense: 1.04 },
    { sourceSegmentIndex: 8, sourceEncounterIndex: 4, hp: 1.1, damage: 1.1, defense: 1.06 },
    { sourceSegmentIndex: 9, sourceEncounterIndex: 4, hp: 1.15, damage: 1.15, defense: 1.1 },
  ],
  [HERETIC_T5_DUNGEON_ID]: [
    { sourceSegmentIndex: 9, sourceEncounterIndex: 0, hp: 1.05, damage: 1.05, defense: 1.02 },
    { sourceSegmentIndex: 9, sourceEncounterIndex: 1, hp: 1.08, damage: 1.08, defense: 1.04 },
    { sourceSegmentIndex: 8, sourceEncounterIndex: 4, hp: 1.1, damage: 1.1, defense: 1.06 },
    { sourceSegmentIndex: 9, sourceEncounterIndex: 4, hp: 1.02, damage: 1.15, defense: 1.1 },
  ],
  [UNDEAD_T5_DUNGEON_ID]: [
    { sourceSegmentIndex: 9, sourceEncounterIndex: 0, hp: 1.05, damage: 1.05, defense: 1.02 },
    { sourceSegmentIndex: 9, sourceEncounterIndex: 1, hp: 1.08, damage: 1.08, defense: 1.04 },
    { sourceSegmentIndex: 8, sourceEncounterIndex: 4, hp: 1.1, damage: 1.1, defense: 1.06 },
    { sourceSegmentIndex: 9, sourceEncounterIndex: 4, hp: 1.04, damage: 1.15, defense: 1.1 },
  ],
  [MORGANA_T5_DUNGEON_ID]: [
    { sourceSegmentIndex: 9, sourceEncounterIndex: 0, hp: 1.05, damage: 1.05, defense: 1.02 },
    { sourceSegmentIndex: 9, sourceEncounterIndex: 1, hp: 1.08, damage: 1.08, defense: 1.04 },
    { sourceSegmentIndex: 8, sourceEncounterIndex: 4, hp: 1.1, damage: 1.1, defense: 1.06 },
    { sourceSegmentIndex: 9, sourceEncounterIndex: 4, hp: 1.02, damage: 1.15, defense: 1.1 },
  ],
  [KEEPER_T6_DUNGEON_ID]: [
    { sourceSegmentIndex: 9, sourceEncounterIndex: 0, hp: 1.05, damage: 0.96, defense: 1.02 },
    { sourceSegmentIndex: 9, sourceEncounterIndex: 1, hp: 1.08, damage: 0.98, defense: 1.04 },
    { sourceSegmentIndex: 8, sourceEncounterIndex: 4, hp: 1.1, damage: 1, defense: 1.06 },
    { sourceSegmentIndex: 9, sourceEncounterIndex: 4, hp: 1.15, damage: 1.05, defense: 1.1 },
  ],
  [HERETIC_T6_DUNGEON_ID]: [
    { sourceSegmentIndex: 9, sourceEncounterIndex: 0, hp: 1.05, damage: 0.96, defense: 1.02 },
    { sourceSegmentIndex: 9, sourceEncounterIndex: 1, hp: 1.08, damage: 0.98, defense: 1.04 },
    { sourceSegmentIndex: 8, sourceEncounterIndex: 4, hp: 1.1, damage: 1, defense: 1.06 },
    { sourceSegmentIndex: 9, sourceEncounterIndex: 4, hp: 1.45, damage: 1.05, defense: 1.1 },
  ],
  [UNDEAD_T6_DUNGEON_ID]: [
    { sourceSegmentIndex: 9, sourceEncounterIndex: 0, hp: 1.05, damage: 0.96, defense: 1.02 },
    { sourceSegmentIndex: 9, sourceEncounterIndex: 1, hp: 1.08, damage: 0.98, defense: 1.04 },
    { sourceSegmentIndex: 8, sourceEncounterIndex: 4, hp: 1.1, damage: 1, defense: 1.06 },
    { sourceSegmentIndex: 9, sourceEncounterIndex: 4, hp: 1.311, damage: 1.05, defense: 1.1 },
  ],
  [MORGANA_T6_DUNGEON_ID]: [
    { sourceSegmentIndex: 9, sourceEncounterIndex: 0, hp: 1.05, damage: 0.96, defense: 1.02 },
    { sourceSegmentIndex: 9, sourceEncounterIndex: 1, hp: 1.08, damage: 0.98, defense: 1.04 },
    { sourceSegmentIndex: 8, sourceEncounterIndex: 4, hp: 1.1, damage: 1, defense: 1.06 },
    { sourceSegmentIndex: 9, sourceEncounterIndex: 4, hp: 1.288, damage: 1.05, defense: 1.1 },
  ],
  [KEEPER_T7_DUNGEON_ID]: [
    { sourceSegmentIndex: 9, sourceEncounterIndex: 0, hp: 1.05, damage: 0.96, defense: 1.02 },
    { sourceSegmentIndex: 9, sourceEncounterIndex: 1, hp: 1.08, damage: 0.98, defense: 1.04 },
    { sourceSegmentIndex: 8, sourceEncounterIndex: 4, hp: 1.1, damage: 1, defense: 1.06 },
    { sourceSegmentIndex: 9, sourceEncounterIndex: 4, hp: 1.15, damage: 1.05, defense: 1.1 },
  ],
  [HERETIC_T7_DUNGEON_ID]: [
    { sourceSegmentIndex: 9, sourceEncounterIndex: 0, hp: 1.05, damage: 0.96, defense: 1.02 },
    { sourceSegmentIndex: 9, sourceEncounterIndex: 1, hp: 1.08, damage: 0.98, defense: 1.04 },
    { sourceSegmentIndex: 8, sourceEncounterIndex: 4, hp: 1.1, damage: 1, defense: 1.06 },
    { sourceSegmentIndex: 9, sourceEncounterIndex: 4, hp: 2.093, damage: 1.05, defense: 1.1 },
  ],
  [UNDEAD_T7_DUNGEON_ID]: [
    { sourceSegmentIndex: 9, sourceEncounterIndex: 0, hp: 1.05, damage: 0.96, defense: 1.02 },
    { sourceSegmentIndex: 9, sourceEncounterIndex: 1, hp: 1.08, damage: 0.98, defense: 1.04 },
    { sourceSegmentIndex: 8, sourceEncounterIndex: 4, hp: 1.1, damage: 1, defense: 1.06 },
    { sourceSegmentIndex: 9, sourceEncounterIndex: 4, hp: 1.633, damage: 1.05, defense: 1.1 },
  ],
  [MORGANA_T7_DUNGEON_ID]: [
    { sourceSegmentIndex: 9, sourceEncounterIndex: 0, hp: 1.05, damage: 0.96, defense: 1.02 },
    { sourceSegmentIndex: 9, sourceEncounterIndex: 1, hp: 1.08, damage: 0.98, defense: 1.04 },
    { sourceSegmentIndex: 8, sourceEncounterIndex: 4, hp: 1.1, damage: 1, defense: 1.06 },
    { sourceSegmentIndex: 9, sourceEncounterIndex: 4, hp: 1.61, damage: 1.05, defense: 1.1 },
  ],
  [KEEPER_T8_DUNGEON_ID]: [
    { sourceSegmentIndex: 9, sourceEncounterIndex: 0, hp: 1.05, damage: 0.96, defense: 1.02 },
    { sourceSegmentIndex: 9, sourceEncounterIndex: 1, hp: 1.08, damage: 0.98, defense: 1.04 },
    { sourceSegmentIndex: 8, sourceEncounterIndex: 4, hp: 1.1, damage: 1, defense: 1.06 },
    { sourceSegmentIndex: 9, sourceEncounterIndex: 4, hp: 1.15, damage: 1.05, defense: 1.1 },
  ],
  [HERETIC_T8_DUNGEON_ID]: [
    { sourceSegmentIndex: 9, sourceEncounterIndex: 0, hp: 1.05, damage: 0.96, defense: 1.02 },
    { sourceSegmentIndex: 9, sourceEncounterIndex: 1, hp: 1.08, damage: 0.98, defense: 1.04 },
    { sourceSegmentIndex: 8, sourceEncounterIndex: 4, hp: 1.1, damage: 1, defense: 1.06 },
    { sourceSegmentIndex: 9, sourceEncounterIndex: 4, hp: 1.53, damage: 1.05, defense: 1.1 },
  ],
  [UNDEAD_T8_DUNGEON_ID]: [
    { sourceSegmentIndex: 9, sourceEncounterIndex: 0, hp: 1.05, damage: 0.96, defense: 1.02 },
    { sourceSegmentIndex: 9, sourceEncounterIndex: 1, hp: 1.08, damage: 0.98, defense: 1.04 },
    { sourceSegmentIndex: 8, sourceEncounterIndex: 4, hp: 1.1, damage: 1, defense: 1.06 },
    { sourceSegmentIndex: 9, sourceEncounterIndex: 4, hp: 1.32, damage: 1.05, defense: 1.1 },
  ],
  [MORGANA_T8_DUNGEON_ID]: [
    { sourceSegmentIndex: 9, sourceEncounterIndex: 0, hp: 1.05, damage: 0.96, defense: 1.02 },
    { sourceSegmentIndex: 9, sourceEncounterIndex: 1, hp: 1.08, damage: 0.98, defense: 1.04 },
    { sourceSegmentIndex: 8, sourceEncounterIndex: 4, hp: 1.1, damage: 1, defense: 1.06 },
    { sourceSegmentIndex: 9, sourceEncounterIndex: 4, hp: 1.28, damage: 1.05, defense: 1.1 },
  ],
};

interface FactionDungeonRoster {
  readonly faction: string;
  readonly normalA: string;
  readonly normalB: string;
  readonly elite: string;
  readonly boss: string;
}

const FACTION_DUNGEON_ROSTERS = {
  keeper: { faction: "Keeper", normalA: MONSTER_IDS.keeperWarrior, normalB: MONSTER_IDS.keeperShaman, elite: MONSTER_IDS.keeperChampion, boss: MONSTER_IDS.keeperAncient },
  heretic: { faction: "Heretic", normalA: MONSTER_IDS.hereticThug, normalB: MONSTER_IDS.hereticFirestarter, elite: MONSTER_IDS.hereticEnforcer, boss: MONSTER_IDS.hereticMadmen },
  undead: { faction: "Undead", normalA: MONSTER_IDS.undeadSkeletonSwordsman, normalB: MONSTER_IDS.undeadSkeletonArcher, elite: MONSTER_IDS.undeadSpectralKnight, boss: MONSTER_IDS.undeadLich },
  morgana: { faction: "Morgana", normalA: MONSTER_IDS.morganaWitch, normalB: MONSTER_IDS.morganaSuppressor, elite: MONSTER_IDS.morganaDarkKnight, boss: MONSTER_IDS.morganaHighPriestess },
} as const satisfies Readonly<Record<string, FactionDungeonRoster>>;

function createFactionDungeon(input: { readonly id: string; readonly tier: AuthoredDungeonTier; readonly combatProfileId: string; readonly lootTableId: string; readonly roster: FactionDungeonRoster; readonly slug: string }): DungeonDefinition {
  const { id, tier, combatProfileId, lootTableId, roster, slug } = input;
  return {
    id, tier, faction: roster.faction, keyItemId: getDungeonKeyItemId(tier), combatProfileId, lootTableId,
    encounters: [
      { id: `${slug}_t${tier}_normal_1`, kind: "normal", monsterDefinitionId: roster.normalA },
      { id: `${slug}_t${tier}_normal_2`, kind: "normal", monsterDefinitionId: roster.normalB },
      { id: `${slug}_t${tier}_elite`, kind: "elite", monsterDefinitionId: roster.elite },
      { id: `${slug}_t${tier}_boss`, kind: "boss", monsterDefinitionId: roster.boss },
    ],
  };
}

export const KEEPER_T4_DUNGEON = createFactionDungeon({ id: KEEPER_T4_DUNGEON_ID, tier: 4, combatProfileId: FACTION_T4_COMBAT_PROFILE_ID, lootTableId: KEEPER_T4_LOOT_TABLE_ID, roster: FACTION_DUNGEON_ROSTERS.keeper, slug: "keeper" });
export const HERETIC_T4_DUNGEON = createFactionDungeon({ id: HERETIC_T4_DUNGEON_ID, tier: 4, combatProfileId: FACTION_T4_COMBAT_PROFILE_ID, lootTableId: HERETIC_T4_LOOT_TABLE_ID, roster: FACTION_DUNGEON_ROSTERS.heretic, slug: "heretic" });
export const UNDEAD_T4_DUNGEON = createFactionDungeon({ id: UNDEAD_T4_DUNGEON_ID, tier: 4, combatProfileId: FACTION_T4_COMBAT_PROFILE_ID, lootTableId: UNDEAD_T4_LOOT_TABLE_ID, roster: FACTION_DUNGEON_ROSTERS.undead, slug: "undead" });
export const MORGANA_T4_DUNGEON = createFactionDungeon({ id: MORGANA_T4_DUNGEON_ID, tier: 4, combatProfileId: FACTION_T4_COMBAT_PROFILE_ID, lootTableId: MORGANA_T4_LOOT_TABLE_ID, roster: FACTION_DUNGEON_ROSTERS.morgana, slug: "morgana" });
export const KEEPER_T5_DUNGEON = createFactionDungeon({ id: KEEPER_T5_DUNGEON_ID, tier: 5, combatProfileId: FACTION_T5_COMBAT_PROFILE_ID, lootTableId: KEEPER_T5_LOOT_TABLE_ID, roster: FACTION_DUNGEON_ROSTERS.keeper, slug: "keeper" });
export const HERETIC_T5_DUNGEON = createFactionDungeon({ id: HERETIC_T5_DUNGEON_ID, tier: 5, combatProfileId: FACTION_T5_COMBAT_PROFILE_ID, lootTableId: HERETIC_T5_LOOT_TABLE_ID, roster: FACTION_DUNGEON_ROSTERS.heretic, slug: "heretic" });
export const UNDEAD_T5_DUNGEON = createFactionDungeon({ id: UNDEAD_T5_DUNGEON_ID, tier: 5, combatProfileId: FACTION_T5_COMBAT_PROFILE_ID, lootTableId: UNDEAD_T5_LOOT_TABLE_ID, roster: FACTION_DUNGEON_ROSTERS.undead, slug: "undead" });
export const MORGANA_T5_DUNGEON = createFactionDungeon({ id: MORGANA_T5_DUNGEON_ID, tier: 5, combatProfileId: FACTION_T5_COMBAT_PROFILE_ID, lootTableId: MORGANA_T5_LOOT_TABLE_ID, roster: FACTION_DUNGEON_ROSTERS.morgana, slug: "morgana" });
export const KEEPER_T6_DUNGEON = createFactionDungeon({ id: KEEPER_T6_DUNGEON_ID, tier: 6, combatProfileId: FACTION_T6_COMBAT_PROFILE_ID, lootTableId: KEEPER_T6_LOOT_TABLE_ID, roster: FACTION_DUNGEON_ROSTERS.keeper, slug: "keeper" });
export const HERETIC_T6_DUNGEON = createFactionDungeon({ id: HERETIC_T6_DUNGEON_ID, tier: 6, combatProfileId: FACTION_T6_COMBAT_PROFILE_ID, lootTableId: HERETIC_T6_LOOT_TABLE_ID, roster: FACTION_DUNGEON_ROSTERS.heretic, slug: "heretic" });
export const UNDEAD_T6_DUNGEON = createFactionDungeon({ id: UNDEAD_T6_DUNGEON_ID, tier: 6, combatProfileId: FACTION_T6_COMBAT_PROFILE_ID, lootTableId: UNDEAD_T6_LOOT_TABLE_ID, roster: FACTION_DUNGEON_ROSTERS.undead, slug: "undead" });
export const MORGANA_T6_DUNGEON = createFactionDungeon({ id: MORGANA_T6_DUNGEON_ID, tier: 6, combatProfileId: FACTION_T6_COMBAT_PROFILE_ID, lootTableId: MORGANA_T6_LOOT_TABLE_ID, roster: FACTION_DUNGEON_ROSTERS.morgana, slug: "morgana" });
export const KEEPER_T7_DUNGEON = createFactionDungeon({ id: KEEPER_T7_DUNGEON_ID, tier: 7, combatProfileId: FACTION_T7_COMBAT_PROFILE_ID, lootTableId: KEEPER_T7_LOOT_TABLE_ID, roster: FACTION_DUNGEON_ROSTERS.keeper, slug: "keeper" });
export const HERETIC_T7_DUNGEON = createFactionDungeon({ id: HERETIC_T7_DUNGEON_ID, tier: 7, combatProfileId: FACTION_T7_COMBAT_PROFILE_ID, lootTableId: HERETIC_T7_LOOT_TABLE_ID, roster: FACTION_DUNGEON_ROSTERS.heretic, slug: "heretic" });
export const UNDEAD_T7_DUNGEON = createFactionDungeon({ id: UNDEAD_T7_DUNGEON_ID, tier: 7, combatProfileId: FACTION_T7_COMBAT_PROFILE_ID, lootTableId: UNDEAD_T7_LOOT_TABLE_ID, roster: FACTION_DUNGEON_ROSTERS.undead, slug: "undead" });
export const MORGANA_T7_DUNGEON = createFactionDungeon({ id: MORGANA_T7_DUNGEON_ID, tier: 7, combatProfileId: FACTION_T7_COMBAT_PROFILE_ID, lootTableId: MORGANA_T7_LOOT_TABLE_ID, roster: FACTION_DUNGEON_ROSTERS.morgana, slug: "morgana" });
export const KEEPER_T8_DUNGEON = createFactionDungeon({ id: KEEPER_T8_DUNGEON_ID, tier: 8, combatProfileId: FACTION_T8_COMBAT_PROFILE_ID, lootTableId: KEEPER_T8_LOOT_TABLE_ID, roster: FACTION_DUNGEON_ROSTERS.keeper, slug: "keeper" });
export const HERETIC_T8_DUNGEON = createFactionDungeon({ id: HERETIC_T8_DUNGEON_ID, tier: 8, combatProfileId: FACTION_T8_COMBAT_PROFILE_ID, lootTableId: HERETIC_T8_LOOT_TABLE_ID, roster: FACTION_DUNGEON_ROSTERS.heretic, slug: "heretic" });
export const UNDEAD_T8_DUNGEON = createFactionDungeon({ id: UNDEAD_T8_DUNGEON_ID, tier: 8, combatProfileId: FACTION_T8_COMBAT_PROFILE_ID, lootTableId: UNDEAD_T8_LOOT_TABLE_ID, roster: FACTION_DUNGEON_ROSTERS.undead, slug: "undead" });
export const MORGANA_T8_DUNGEON = createFactionDungeon({ id: MORGANA_T8_DUNGEON_ID, tier: 8, combatProfileId: FACTION_T8_COMBAT_PROFILE_ID, lootTableId: MORGANA_T8_LOOT_TABLE_ID, roster: FACTION_DUNGEON_ROSTERS.morgana, slug: "morgana" });

export const DUNGEON_DEFINITIONS = [
  KEEPER_T4_DUNGEON, HERETIC_T4_DUNGEON, UNDEAD_T4_DUNGEON, MORGANA_T4_DUNGEON,
  KEEPER_T5_DUNGEON, HERETIC_T5_DUNGEON, UNDEAD_T5_DUNGEON, MORGANA_T5_DUNGEON,
  KEEPER_T6_DUNGEON, HERETIC_T6_DUNGEON, UNDEAD_T6_DUNGEON, MORGANA_T6_DUNGEON,
  KEEPER_T7_DUNGEON, HERETIC_T7_DUNGEON, UNDEAD_T7_DUNGEON, MORGANA_T7_DUNGEON,
  KEEPER_T8_DUNGEON, HERETIC_T8_DUNGEON, UNDEAD_T8_DUNGEON, MORGANA_T8_DUNGEON,
] as const;

const DUNGEON_DEFINITION_BY_ID: Readonly<Record<string, DungeonDefinition>> = Object.fromEntries(DUNGEON_DEFINITIONS.map((definition) => [definition.id, definition]));

export function getDungeonDefinition(dungeonDefinitionId: string): DungeonDefinition {
  const definition = DUNGEON_DEFINITION_BY_ID[dungeonDefinitionId];
  if (definition === undefined) throw new Error(`Unknown dungeon definition: ${dungeonDefinitionId}`);
  return definition;
}

export function resolveDungeonCombatProfile(input: { readonly dungeonDefinitionId: string; readonly encounterIndex: number; readonly monsterDefinitionId: string }): AuthoredEnemyCombatProfile {
  const dungeon = getDungeonDefinition(input.dungeonDefinitionId);
  const source = DUNGEON_COMBAT_SOURCES[dungeon.combatProfileId];
  if (source === undefined) throw new Error(`Unknown dungeon combat source: ${dungeon.combatProfileId}`);
  const balanceSteps = DUNGEON_ENCOUNTER_BALANCE_BY_ID[dungeon.id];
  if (balanceSteps === undefined) throw new Error(`Missing authored dungeon balance: ${dungeon.id}`);
  const step = balanceSteps[input.encounterIndex];
  if (step === undefined) throw new Error(`Invalid dungeon encounter index: ${String(input.encounterIndex)} for ${dungeon.id}`);
  const authoredEncounter = dungeon.encounters[input.encounterIndex];
  if (authoredEncounter?.monsterDefinitionId !== input.monsterDefinitionId) throw new Error(`Dungeon encounter monster mismatch for ${dungeon.id} at ${String(input.encounterIndex)}`);
  const base = getEnemyCombatProfile(source.sourceZoneIndexWithinBand, step.sourceSegmentIndex, step.sourceEncounterIndex, source.bandId);
  return {
    hp: Math.round(base.hp * step.hp),
    damage: Math.round(base.damage * step.damage),
    attackSpeed: base.attackSpeed,
    armor: Math.round(base.armor * step.defense),
    magicResistance: Math.round(base.magicResistance * step.defense),
  };
}

/** @deprecated Temporary import compatibility; all resolution is now generic. */
export const resolveKeeperT4DungeonCombatProfile = resolveDungeonCombatProfile;

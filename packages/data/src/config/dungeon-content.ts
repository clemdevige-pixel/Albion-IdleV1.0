import { getDungeonKeyItemId } from "./dungeon-keys.js";
import { MONSTER_IDS } from "./monster-content.js";
import type { WorldBandId } from "./world-bands.js";

export type AuthoredDungeonTier = 4 | 5 | 6 | 7 | 8;

export interface AuthoredDungeonEncounterDefinition {
  readonly id: string;
  readonly kind: "normal" | "elite" | "boss";
  readonly monsterDefinitionId: string;
}

export interface AuthoredDungeonDefinition {
  readonly id: string;
  readonly tier: AuthoredDungeonTier;
  readonly faction: string;
  readonly keyItemId: string;
  readonly combatProfileId: string;
  readonly lootTableId: string;
  readonly encounters: readonly AuthoredDungeonEncounterDefinition[];
}

export interface DungeonCombatSourceDefinition {
  readonly id: string;
  readonly bandId: WorldBandId;
  readonly sourceZoneIndexWithinBand: number;
}

export interface DungeonEncounterBalanceStep {
  readonly sourceSegmentIndex: number;
  readonly sourceEncounterIndex: number;
  readonly hp: number;
  readonly damage: number;
  readonly defense: number;
}

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

export const DUNGEON_COMBAT_SOURCES: Readonly<Record<string, DungeonCombatSourceDefinition>> = {
  [FACTION_T4_COMBAT_PROFILE_ID]: { id: FACTION_T4_COMBAT_PROFILE_ID, bandId: "blue", sourceZoneIndexWithinBand: 4 },
  [FACTION_T5_COMBAT_PROFILE_ID]: { id: FACTION_T5_COMBAT_PROFILE_ID, bandId: "yellow", sourceZoneIndexWithinBand: 4 },
  [FACTION_T6_COMBAT_PROFILE_ID]: { id: FACTION_T6_COMBAT_PROFILE_ID, bandId: "orange", sourceZoneIndexWithinBand: 4 },
  [FACTION_T7_COMBAT_PROFILE_ID]: { id: FACTION_T7_COMBAT_PROFILE_ID, bandId: "red", sourceZoneIndexWithinBand: 4 },
  [FACTION_T8_COMBAT_PROFILE_ID]: { id: FACTION_T8_COMBAT_PROFILE_ID, bandId: "black", sourceZoneIndexWithinBand: 4 },
};

const steps = (bossHp: number, firstDamage: number, secondDamage: number, eliteDamage: number, bossDamage: number, firstHp = 1.05, secondHp = 1.08, eliteHp = 1.1): readonly DungeonEncounterBalanceStep[] => [
  { sourceSegmentIndex: 9, sourceEncounterIndex: 0, hp: firstHp, damage: firstDamage, defense: firstHp === 0.8925 ? 0.969 : 1.02 },
  { sourceSegmentIndex: 9, sourceEncounterIndex: 1, hp: secondHp, damage: secondDamage, defense: secondHp === 0.918 ? 0.988 : 1.04 },
  { sourceSegmentIndex: 8, sourceEncounterIndex: 4, hp: eliteHp, damage: eliteDamage, defense: eliteHp === 0.935 ? 1.007 : 1.06 },
  { sourceSegmentIndex: 9, sourceEncounterIndex: 4, hp: bossHp, damage: bossDamage, defense: bossHp === 0.9775 ? 1.045 : 1.1 },
];

export const DUNGEON_ENCOUNTER_BALANCE_BY_ID: Readonly<Record<string, readonly DungeonEncounterBalanceStep[]>> = {
  [KEEPER_T4_DUNGEON_ID]: steps(0.9775, 0.8925, 0.918, 0.935, 0.9775, 0.8925, 0.918, 0.935),
  [HERETIC_T4_DUNGEON_ID]: steps(0.828, 1.134, 1.1664, 1.188, 1.242),
  [UNDEAD_T4_DUNGEON_ID]: steps(0.7705, 1.05, 1.08, 1.1, 1.15),
  [MORGANA_T4_DUNGEON_ID]: steps(0.759, 1.05, 1.08, 1.1, 1.15),
  [KEEPER_T5_DUNGEON_ID]: steps(1.15, 1.05, 1.08, 1.1, 1.15),
  [HERETIC_T5_DUNGEON_ID]: steps(0.75, 1.05, 1.08, 1.21, 1.68),
  [UNDEAD_T5_DUNGEON_ID]: steps(1.04, 1.05, 1.08, 1.1, 1.18),
  [MORGANA_T5_DUNGEON_ID]: steps(0.85, 1.05, 1.08, 1.1, 1.30),
  [KEEPER_T6_DUNGEON_ID]: steps(1.21, 0.96, 0.98, 1, 1.05),
  [HERETIC_T6_DUNGEON_ID]: steps(1.45, 0.96, 0.98, 1, 1.05),
  [UNDEAD_T6_DUNGEON_ID]: steps(1.311, 0.96, 0.98, 1, 1.05),
  [MORGANA_T6_DUNGEON_ID]: steps(1.288, 0.96, 0.98, 1, 1.05),
  [KEEPER_T7_DUNGEON_ID]: steps(1.63, 0.96, 0.98, 1, 1.05),
  [HERETIC_T7_DUNGEON_ID]: steps(2.093, 0.96, 0.98, 1, 1.05),
  [UNDEAD_T7_DUNGEON_ID]: steps(1.633, 0.96, 0.98, 1, 1.05),
  [MORGANA_T7_DUNGEON_ID]: steps(1.61, 0.96, 0.98, 1, 1.05),
  [KEEPER_T8_DUNGEON_ID]: steps(1, 0.96, 0.98, 1, 1.05),
  [HERETIC_T8_DUNGEON_ID]: steps(1.53, 0.96, 0.98, 1, 1.05),
  [UNDEAD_T8_DUNGEON_ID]: steps(1.32, 0.96, 0.98, 1, 1.05),
  [MORGANA_T8_DUNGEON_ID]: steps(1.28, 0.96, 0.98, 1, 1.05),
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

function createFactionDungeon(input: { readonly id: string; readonly tier: AuthoredDungeonTier; readonly combatProfileId: string; readonly lootTableId: string; readonly roster: FactionDungeonRoster; readonly slug: string }): AuthoredDungeonDefinition {
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

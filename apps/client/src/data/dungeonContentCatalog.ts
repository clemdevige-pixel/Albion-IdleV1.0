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

/** @deprecated T4 faction dungeons now share one authored combat profile. */
export const KEEPER_T4_COMBAT_PROFILE_ID = FACTION_T4_COMBAT_PROFILE_ID;

interface DungeonCombatProfileStep {
  readonly sourceSegmentIndex: number;
  readonly sourceEncounterIndex: number;
  readonly hp: number;
  readonly damage: number;
  readonly defense: number;
}

interface DungeonCombatProfileDefinition {
  readonly id: string;
  readonly bandId: WorldBandId;
  readonly sourceZoneIndexWithinBand: number;
  readonly steps: readonly DungeonCombatProfileStep[];
}

interface DungeonCombatTuning {
  readonly hp: number;
  readonly damage: number;
  readonly defense: number;
}

const FACTION_DUNGEON_PRESSURE_STEPS: readonly DungeonCombatProfileStep[] = [
  { sourceSegmentIndex: 9, sourceEncounterIndex: 0, hp: 1.05, damage: 1.05, defense: 1.02 },
  { sourceSegmentIndex: 9, sourceEncounterIndex: 1, hp: 1.08, damage: 1.08, defense: 1.04 },
  { sourceSegmentIndex: 8, sourceEncounterIndex: 4, hp: 1.1, damage: 1.1, defense: 1.06 },
  { sourceSegmentIndex: 9, sourceEncounterIndex: 4, hp: 1.15, damage: 1.15, defense: 1.1 },
];

/**
 * High-tier faction dungeons keep the optimization wall while trimming raw
 * incoming damage because world-end bosses are already sustain checks and the
 * dungeon runtime persists HP/cooldowns across all four encounters.
 */
const HIGH_TIER_DUNGEON_PRESSURE_STEPS: readonly DungeonCombatProfileStep[] = [
  { sourceSegmentIndex: 9, sourceEncounterIndex: 0, hp: 1.05, damage: 0.96, defense: 1.02 },
  { sourceSegmentIndex: 9, sourceEncounterIndex: 1, hp: 1.08, damage: 0.98, defense: 1.04 },
  { sourceSegmentIndex: 8, sourceEncounterIndex: 4, hp: 1.1, damage: 1.0, defense: 1.06 },
  { sourceSegmentIndex: 9, sourceEncounterIndex: 4, hp: 1.15, damage: 1.05, defense: 1.1 },
];

/** Faction dungeons share one pressure shape per tier; the world band owns scale. */
const FACTION_T4_COMBAT_PROFILE: DungeonCombatProfileDefinition = {
  id: FACTION_T4_COMBAT_PROFILE_ID, bandId: "blue", sourceZoneIndexWithinBand: 4, steps: FACTION_DUNGEON_PRESSURE_STEPS,
};
const FACTION_T5_COMBAT_PROFILE: DungeonCombatProfileDefinition = {
  id: FACTION_T5_COMBAT_PROFILE_ID, bandId: "yellow", sourceZoneIndexWithinBand: 4, steps: FACTION_DUNGEON_PRESSURE_STEPS,
};
const FACTION_T6_COMBAT_PROFILE: DungeonCombatProfileDefinition = {
  id: FACTION_T6_COMBAT_PROFILE_ID, bandId: "orange", sourceZoneIndexWithinBand: 4, steps: HIGH_TIER_DUNGEON_PRESSURE_STEPS,
};
const FACTION_T7_COMBAT_PROFILE: DungeonCombatProfileDefinition = {
  id: FACTION_T7_COMBAT_PROFILE_ID, bandId: "red", sourceZoneIndexWithinBand: 4, steps: HIGH_TIER_DUNGEON_PRESSURE_STEPS,
};
const FACTION_T8_COMBAT_PROFILE: DungeonCombatProfileDefinition = {
  id: FACTION_T8_COMBAT_PROFILE_ID, bandId: "black", sourceZoneIndexWithinBand: 4, steps: HIGH_TIER_DUNGEON_PRESSURE_STEPS,
};

const DUNGEON_COMBAT_PROFILES: Readonly<Record<string, DungeonCombatProfileDefinition>> = {
  [FACTION_T4_COMBAT_PROFILE.id]: FACTION_T4_COMBAT_PROFILE,
  [FACTION_T5_COMBAT_PROFILE.id]: FACTION_T5_COMBAT_PROFILE,
  [FACTION_T6_COMBAT_PROFILE.id]: FACTION_T6_COMBAT_PROFILE,
  [FACTION_T7_COMBAT_PROFILE.id]: FACTION_T7_COMBAT_PROFILE,
  [FACTION_T8_COMBAT_PROFILE.id]: FACTION_T8_COMBAT_PROFILE,
};

/**
 * Per-dungeon authored exceptions stay data-driven and outside shared combat
 * logic. Keeper T4 is the progression bootstrap and restores the historically
 * validated calibration required for reliable same-tier T4.3 entry clears.
 */
const DUNGEON_COMBAT_TUNING_BY_ID: Readonly<Record<string, DungeonCombatTuning>> = {
  [KEEPER_T4_DUNGEON_ID]: { hp: 0.85, damage: 0.85, defense: 0.95 },
};

const DEFAULT_DUNGEON_COMBAT_TUNING: DungeonCombatTuning = { hp: 1, damage: 1, defense: 1 };

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

type AuthoredDungeonTier = 4 | 5 | 6 | 7 | 8;

/**
 * Keeper stays the same-tier entry dungeon. Progression factions become
 * increasingly explicit DPS gates as tiers rise so the canonical +20% artifact
 * matchup remains meaningful even after branch/cross-specialization mastery IP.
 * Only boss HP is tuned here; trash, elite pressure, damage and world monsters
 * remain untouched.
 */
const FACTION_BOSS_HP_MULTIPLIER_BY_TIER: Readonly<Record<AuthoredDungeonTier, Readonly<Record<string, number>>>> = {
  4: { Keeper: 1, Heretic: 0.76, Undead: 0.67, Morgana: 0.66 },
  5: { Keeper: 1, Heretic: 1.12, Undead: 1.08, Morgana: 1 },
  6: { Keeper: 1, Heretic: 1.18, Undead: 1.14, Morgana: 1.12 },
  7: { Keeper: 1, Heretic: 1.82, Undead: 1.42, Morgana: 1.4 },
  8: { Keeper: 1, Heretic: 1.82, Undead: 1.44, Morgana: 1.36 },
};

function createFactionDungeon(input: {
  readonly id: string;
  readonly tier: AuthoredDungeonTier;
  readonly combatProfileId: string;
  readonly lootTableId: string;
  readonly roster: FactionDungeonRoster;
  readonly slug: string;
}): DungeonDefinition {
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
  const profile = DUNGEON_COMBAT_PROFILES[dungeon.combatProfileId];
  if (profile === undefined) throw new Error(`Unknown dungeon combat profile: ${dungeon.combatProfileId}`);
  const step = profile.steps[input.encounterIndex];
  if (step === undefined) throw new Error(`Invalid dungeon encounter index: ${String(input.encounterIndex)} for ${dungeon.id}`);
  const authoredEncounter = dungeon.encounters[input.encounterIndex];
  if (authoredEncounter?.monsterDefinitionId !== input.monsterDefinitionId) throw new Error(`Dungeon encounter monster mismatch for ${dungeon.id} at ${String(input.encounterIndex)}`);
  const base = getEnemyCombatProfile(profile.sourceZoneIndexWithinBand, step.sourceSegmentIndex, step.sourceEncounterIndex, profile.bandId);
  const bossHpMultiplier = authoredEncounter.kind === "boss"
    ? (FACTION_BOSS_HP_MULTIPLIER_BY_TIER[dungeon.tier as AuthoredDungeonTier]?.[dungeon.faction] ?? 1)
    : 1;
  const dungeonTuning = DUNGEON_COMBAT_TUNING_BY_ID[dungeon.id] ?? DEFAULT_DUNGEON_COMBAT_TUNING;
  return {
    hp: Math.round(base.hp * step.hp * bossHpMultiplier * dungeonTuning.hp),
    damage: Math.round(base.damage * step.damage * dungeonTuning.damage),
    attackSpeed: base.attackSpeed,
    armor: Math.round(base.armor * step.defense * dungeonTuning.defense),
    magicResistance: Math.round(base.magicResistance * step.defense * dungeonTuning.defense),
  };
}

/** @deprecated Temporary import compatibility; all resolution is now generic. */
export const resolveKeeperT4DungeonCombatProfile = resolveDungeonCombatProfile;
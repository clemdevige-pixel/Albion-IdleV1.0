import { ENCOUNTERS_PER_SEGMENT, SEGMENTS_PER_ZONE } from "@game/data";
import type { DamageType, ZoneDefinitionId } from "@game/gameplay";
import { MONSTER_ABILITY_IDS } from "./monsterAbilityContentCatalog";

export type MonsterCategory = "normal" | "veteran" | "elite" | "boss";

export interface MonsterCombatModifiers { readonly damageType: DamageType; }
export interface MonsterRewardDefinition { readonly lootTableId: string; }
export interface MonsterContentDefinition { readonly id: string; readonly name: string; readonly faction: string; readonly category: MonsterCategory; readonly tier: number; readonly visualManifestId: string; readonly combat: MonsterCombatModifiers; readonly rewards: MonsterRewardDefinition; readonly abilityIds: readonly string[]; readonly tags: readonly string[]; }
export interface FactionEncounterRoster {
  readonly faction: string;
  readonly normal: readonly string[];
  readonly elite: string;
}

export interface ZoneEncounterPool {
  readonly dominant: FactionEncounterRoster;
  readonly secondary: FactionEncounterRoster;
  readonly biomeBoss: string;
}

export const MONSTER_IDS = {
  morganaWitch: "monster_morgana_witch", morganaSuppressor: "monster_morgana_suppressor", morganaDarkKnight: "monster_morgana_dark_knight", morganaHighPriestess: "boss_morgana_high_priestess",
  undeadWarrior: "monster_undead_warrior", undeadSkeletonSwordsman: "monster_undead_skeleton_swordsman", undeadSkeletonArcher: "monster_undead_skeleton_archer", undeadSpectralKnight: "monster_undead_spectral_knight", undeadLich: "boss_undead_lich",
  keeperWarrior: "monster_keeper_warrior", keeperShaman: "monster_keeper_shaman", keeperChampion: "monster_keeper_champion", keeperAncient: "boss_keeper_ancient",
  hereticThug: "monster_heretic_thug", hereticFirestarter: "monster_heretic_firestarter", hereticEnforcer: "monster_heretic_enforcer", hereticMadmen: "boss_heretic_madmen",
} as const;

export const MONSTER_DEFINITIONS: Readonly<Record<string, MonsterContentDefinition>> = {
  [MONSTER_IDS.morganaWitch]: { id: MONSTER_IDS.morganaWitch, name: "Morgana Witch", faction: "Morgana", category: "normal", tier: 3, visualManifestId: "monster_morgana_witch", combat: { damageType: "magical" }, rewards: { lootTableId: "loot_morgana_normal" }, abilityIds: [MONSTER_ABILITY_IDS.morganaWitchShadowBolt], tags: ["morgana", "caster", "ranged"] },
  [MONSTER_IDS.morganaSuppressor]: { id: MONSTER_IDS.morganaSuppressor, name: "Morgana Suppressor", faction: "Morgana", category: "normal", tier: 3, visualManifestId: "monster_morgana_suppressor", combat: { damageType: "physical" }, rewards: { lootTableId: "loot_morgana_normal" }, abilityIds: [MONSTER_ABILITY_IDS.morganaSuppressorBolt], tags: ["morgana", "ranged", "crossbow"] },
  [MONSTER_IDS.morganaDarkKnight]: { id: MONSTER_IDS.morganaDarkKnight, name: "Morgana Dark Knight", faction: "Morgana", category: "elite", tier: 3, visualManifestId: "monster_morgana_dark_knight", combat: { damageType: "physical" }, rewards: { lootTableId: "loot_morgana_elite" }, abilityIds: [MONSTER_ABILITY_IDS.morganaDarkKnightVoidCleave, MONSTER_ABILITY_IDS.morganaDarkKnightCrushingAdvance], tags: ["morgana", "elite", "melee", "segment_boss"] },
  [MONSTER_IDS.morganaHighPriestess]: { id: MONSTER_IDS.morganaHighPriestess, name: "Morgana High Priestess", faction: "Morgana", category: "boss", tier: 3, visualManifestId: "boss_morgana_high_priestess", combat: { damageType: "magical" }, rewards: { lootTableId: "loot_morgana_boss" }, abilityIds: [MONSTER_ABILITY_IDS.morganaHighPriestessDarkOrb, MONSTER_ABILITY_IDS.morganaHighPriestessRitualBlast], tags: ["morgana", "caster", "boss", "biome_boss"] },
  [MONSTER_IDS.undeadWarrior]: { id: MONSTER_IDS.undeadWarrior, name: "Undead Warrior", faction: "Undead", category: "boss", tier: 3, visualManifestId: "monster_undead_warrior", combat: { damageType: "physical" }, rewards: { lootTableId: "loot_monster_undead_boss" }, abilityIds: [MONSTER_ABILITY_IDS.undeadHeavySlash], tags: ["undead", "segment_boss"] },
  [MONSTER_IDS.undeadSkeletonSwordsman]: { id: MONSTER_IDS.undeadSkeletonSwordsman, name: "Squelette épéiste", faction: "Undead", category: "normal", tier: 3, visualManifestId: "monster_undead_skeleton_swordsman", combat: { damageType: "physical" }, rewards: { lootTableId: "loot_undead_normal" }, abilityIds: [], tags: ["undead", "skeleton", "melee"] },
  [MONSTER_IDS.undeadSkeletonArcher]: { id: MONSTER_IDS.undeadSkeletonArcher, name: "Squelette archer", faction: "Undead", category: "normal", tier: 3, visualManifestId: "monster_undead_skeleton_archer", combat: { damageType: "physical" }, rewards: { lootTableId: "loot_undead_normal" }, abilityIds: [MONSTER_ABILITY_IDS.undeadPiercingShot], tags: ["undead", "skeleton", "ranged"] },
  [MONSTER_IDS.undeadSpectralKnight]: { id: MONSTER_IDS.undeadSpectralKnight, name: "Chevalier spectral", faction: "Undead", category: "elite", tier: 3, visualManifestId: "monster_undead_spectral_knight", combat: { damageType: "physical" }, rewards: { lootTableId: "loot_undead_elite" }, abilityIds: [MONSTER_ABILITY_IDS.spectralKnightSoulCleave, MONSTER_ABILITY_IDS.spectralKnightPhantomStrike], tags: ["undead", "spectral", "elite", "segment_boss"] },
  [MONSTER_IDS.undeadLich]: { id: MONSTER_IDS.undeadLich, name: "Liche", faction: "Undead", category: "boss", tier: 3, visualManifestId: "boss_undead_lich", combat: { damageType: "magical" }, rewards: { lootTableId: "loot_undead_boss" }, abilityIds: [MONSTER_ABILITY_IDS.lichSoulBolt, MONSTER_ABILITY_IDS.lichDeathWave], tags: ["undead", "caster", "boss", "biome_boss"] },
  [MONSTER_IDS.keeperWarrior]: { id: MONSTER_IDS.keeperWarrior, name: "Guerrier Keeper", faction: "Keeper", category: "normal", tier: 4, visualManifestId: "monster_keeper_warrior", combat: { damageType: "physical" }, rewards: { lootTableId: "loot_keeper_normal" }, abilityIds: [], tags: ["keeper", "melee", "warrior"] },
  [MONSTER_IDS.keeperShaman]: { id: MONSTER_IDS.keeperShaman, name: "Chaman Keeper", faction: "Keeper", category: "normal", tier: 4, visualManifestId: "monster_keeper_shaman", combat: { damageType: "magical" }, rewards: { lootTableId: "loot_keeper_normal" }, abilityIds: [MONSTER_ABILITY_IDS.keeperShamanSpiritBolt], tags: ["keeper", "caster", "shaman"] },
  [MONSTER_IDS.keeperChampion]: { id: MONSTER_IDS.keeperChampion, name: "Champion Keeper", faction: "Keeper", category: "elite", tier: 4, visualManifestId: "monster_keeper_champion", combat: { damageType: "physical" }, rewards: { lootTableId: "loot_keeper_elite" }, abilityIds: [MONSTER_ABILITY_IDS.keeperChampionEarthbreaker, MONSTER_ABILITY_IDS.keeperChampionStoneGuard], tags: ["keeper", "elite", "melee", "segment_boss"] },
  [MONSTER_IDS.keeperAncient]: { id: MONSTER_IDS.keeperAncient, name: "Ancien Keeper", faction: "Keeper", category: "boss", tier: 4, visualManifestId: "boss_keeper_ancient", combat: { damageType: "magical" }, rewards: { lootTableId: "loot_keeper_boss" }, abilityIds: [MONSTER_ABILITY_IDS.keeperAncientSpiritBurst, MONSTER_ABILITY_IDS.keeperAncientPrimalCrush], tags: ["keeper", "caster", "boss", "biome_boss"] },
  [MONSTER_IDS.hereticThug]: { id: MONSTER_IDS.hereticThug, name: "Heretic Thug", faction: "Heretic", category: "normal", tier: 4, visualManifestId: "monster_heretic_thug", combat: { damageType: "physical" }, rewards: { lootTableId: "loot_monster_generic" }, abilityIds: [MONSTER_ABILITY_IDS.hereticThugDirtyStrike], tags: ["heretic", "melee", "thug"] },
  [MONSTER_IDS.hereticFirestarter]: { id: MONSTER_IDS.hereticFirestarter, name: "Heretic Firestarter", faction: "Heretic", category: "normal", tier: 4, visualManifestId: "monster_heretic_firestarter", combat: { damageType: "magical" }, rewards: { lootTableId: "loot_monster_generic" }, abilityIds: [MONSTER_ABILITY_IDS.hereticFirestarterFirebomb], tags: ["heretic", "fire", "ranged"] },
  [MONSTER_IDS.hereticEnforcer]: { id: MONSTER_IDS.hereticEnforcer, name: "Heretic Enforcer", faction: "Heretic", category: "elite", tier: 4, visualManifestId: "monster_heretic_enforcer", combat: { damageType: "physical" }, rewards: { lootTableId: "loot_monster_generic" }, abilityIds: [MONSTER_ABILITY_IDS.hereticEnforcerHeavySmash, MONSTER_ABILITY_IDS.hereticEnforcerRush], tags: ["heretic", "elite", "melee", "segment_boss"] },
  [MONSTER_IDS.hereticMadmen]: { id: MONSTER_IDS.hereticMadmen, name: "Heretic Madmen", faction: "Heretic", category: "boss", tier: 4, visualManifestId: "boss_heretic_madmen", combat: { damageType: "physical" }, rewards: { lootTableId: "loot_monster_generic" }, abilityIds: [MONSTER_ABILITY_IDS.hereticMadmenWildSwing, MONSTER_ABILITY_IDS.hereticMadmenPowderBlast], tags: ["heretic", "boss", "melee", "biome_boss"] },
};

const UNDEAD_PILOT_NORMAL_POOL = [MONSTER_IDS.undeadSkeletonSwordsman, MONSTER_IDS.undeadSkeletonArcher] as const;
const MORGANA_PILOT_NORMAL_POOL = [MONSTER_IDS.morganaWitch, MONSTER_IDS.morganaSuppressor] as const;
const KEEPER_PILOT_NORMAL_POOL = [MONSTER_IDS.keeperWarrior, MONSTER_IDS.keeperShaman] as const;
const HERETIC_PILOT_NORMAL_POOL = [MONSTER_IDS.hereticThug, MONSTER_IDS.hereticFirestarter] as const;

const FACTION_ENCOUNTER_ROSTERS = {
  Undead: { faction: "Undead", normal: UNDEAD_PILOT_NORMAL_POOL, elite: MONSTER_IDS.undeadSpectralKnight },
  Morgana: { faction: "Morgana", normal: MORGANA_PILOT_NORMAL_POOL, elite: MONSTER_IDS.morganaDarkKnight },
  Keeper: { faction: "Keeper", normal: KEEPER_PILOT_NORMAL_POOL, elite: MONSTER_IDS.keeperChampion },
  Heretic: { faction: "Heretic", normal: HERETIC_PILOT_NORMAL_POOL, elite: MONSTER_IDS.hereticEnforcer },
} as const satisfies Readonly<Record<string, FactionEncounterRoster>>;

type EncounterFactionRole = "dominant" | "secondary";

const NORMAL_FACTION_PATTERN_BY_SEGMENT: readonly (readonly EncounterFactionRole[])[] = [
  ["dominant", "dominant", "dominant", "dominant"],
  ["dominant", "dominant", "dominant", "dominant"],
  ["dominant", "dominant", "dominant", "secondary"],
  ["dominant", "dominant", "secondary", "dominant"],
  ["dominant", "secondary", "dominant", "dominant"],
  ["dominant", "secondary", "dominant", "secondary"],
  ["secondary", "dominant", "dominant", "secondary"],
  ["dominant", "secondary", "secondary", "dominant"],
  ["secondary", "dominant", "secondary", "dominant"],
  ["dominant", "secondary", "dominant", "secondary"],
] as const;

const ELITE_FACTION_PATTERN_BY_SEGMENT: readonly EncounterFactionRole[] = [
  "dominant", "dominant", "dominant", "secondary", "dominant",
  "secondary", "dominant", "secondary", "dominant", "dominant",
] as const;

export const ZONE_ENCOUNTER_POOLS: Readonly<Record<string, ZoneEncounterPool>> = {
  zone_forest_t3: { dominant: FACTION_ENCOUNTER_ROSTERS.Keeper, secondary: FACTION_ENCOUNTER_ROSTERS.Heretic, biomeBoss: MONSTER_IDS.keeperAncient },
  zone_swamp_t3: { dominant: FACTION_ENCOUNTER_ROSTERS.Undead, secondary: FACTION_ENCOUNTER_ROSTERS.Morgana, biomeBoss: MONSTER_IDS.undeadLich },
  zone_highland_t3: { dominant: FACTION_ENCOUNTER_ROSTERS.Heretic, secondary: FACTION_ENCOUNTER_ROSTERS.Keeper, biomeBoss: MONSTER_IDS.hereticMadmen },
  zone_steppe_t4: { dominant: FACTION_ENCOUNTER_ROSTERS.Morgana, secondary: FACTION_ENCOUNTER_ROSTERS.Heretic, biomeBoss: MONSTER_IDS.morganaHighPriestess },
  zone_mountain_t4: { dominant: FACTION_ENCOUNTER_ROSTERS.Keeper, secondary: FACTION_ENCOUNTER_ROSTERS.Undead, biomeBoss: MONSTER_IDS.keeperAncient },
  zone_amberwood_t5: { dominant: FACTION_ENCOUNTER_ROSTERS.Morgana, secondary: FACTION_ENCOUNTER_ROSTERS.Keeper, biomeBoss: MONSTER_IDS.morganaHighPriestess },
  zone_gloamfen_t5: { dominant: FACTION_ENCOUNTER_ROSTERS.Undead, secondary: FACTION_ENCOUNTER_ROSTERS.Heretic, biomeBoss: MONSTER_IDS.undeadLich },
  zone_stormwatch_t5: { dominant: FACTION_ENCOUNTER_ROSTERS.Keeper, secondary: FACTION_ENCOUNTER_ROSTERS.Morgana, biomeBoss: MONSTER_IDS.keeperAncient },
  zone_sunscar_t5: { dominant: FACTION_ENCOUNTER_ROSTERS.Heretic, secondary: FACTION_ENCOUNTER_ROSTERS.Undead, biomeBoss: MONSTER_IDS.hereticMadmen },
  zone_ironveil_t5: { dominant: FACTION_ENCOUNTER_ROSTERS.Morgana, secondary: FACTION_ENCOUNTER_ROSTERS.Undead, biomeBoss: MONSTER_IDS.morganaHighPriestess },
  zone_cinderwood_t6: { dominant: FACTION_ENCOUNTER_ROSTERS.Keeper, secondary: FACTION_ENCOUNTER_ROSTERS.Morgana, biomeBoss: MONSTER_IDS.keeperAncient },
  zone_rotfen_t6: { dominant: FACTION_ENCOUNTER_ROSTERS.Undead, secondary: FACTION_ENCOUNTER_ROSTERS.Morgana, biomeBoss: MONSTER_IDS.undeadLich },
  zone_thundercrag_t6: { dominant: FACTION_ENCOUNTER_ROSTERS.Heretic, secondary: FACTION_ENCOUNTER_ROSTERS.Keeper, biomeBoss: MONSTER_IDS.hereticMadmen },
  zone_emberwind_t6: { dominant: FACTION_ENCOUNTER_ROSTERS.Morgana, secondary: FACTION_ENCOUNTER_ROSTERS.Heretic, biomeBoss: MONSTER_IDS.morganaHighPriestess },
  zone_ashenpeak_t6: { dominant: FACTION_ENCOUNTER_ROSTERS.Keeper, secondary: FACTION_ENCOUNTER_ROSTERS.Undead, biomeBoss: MONSTER_IDS.keeperAncient },
};

export function getMonsterDefinition(id: string): MonsterContentDefinition { const definition = MONSTER_DEFINITIONS[id]; if (definition === undefined) throw new Error(`Unknown monster definition: ${id}`); return definition; }
export function applyMonsterRewardModifiers(baseRewards: { readonly silver: number; readonly fame: number }, _monster: MonsterContentDefinition): { readonly silver: number; readonly fame: number } { return { silver: Math.max(0, Math.round(baseRewards.silver)), fame: Math.max(0, Math.round(baseRewards.fame)) }; }
export function getZoneEncounterPool(zoneDefId: ZoneDefinitionId): ZoneEncounterPool { const pool = ZONE_ENCOUNTER_POOLS[String(zoneDefId)]; if (pool === undefined) throw new Error(`Missing monster encounter pool for zone: ${String(zoneDefId)}`); return pool; }
export function resolveEncounterCategory(segmentIndex: number, encounterIndex: number): "normal" | "elite" | "boss" {
  const safeSegmentIndex = Math.max(0, Math.min(SEGMENTS_PER_ZONE - 1, segmentIndex));
  const safeEncounterIndex = Math.max(0, Math.min(ENCOUNTERS_PER_SEGMENT - 1, encounterIndex));
  if (safeEncounterIndex !== ENCOUNTERS_PER_SEGMENT - 1) return "normal";
  return safeSegmentIndex === SEGMENTS_PER_ZONE - 1 ? "boss" : "elite";
}

export function resolveMonsterForEncounter(zoneDefId: ZoneDefinitionId, segmentIndex: number, encounterIndex: number): MonsterContentDefinition {
  const pool = getZoneEncounterPool(zoneDefId);
  const safeSegmentIndex = Math.max(0, Math.min(SEGMENTS_PER_ZONE - 1, segmentIndex));
  const safeEncounterIndex = Math.max(0, Math.min(ENCOUNTERS_PER_SEGMENT - 1, encounterIndex));
  const encounterCategory = resolveEncounterCategory(safeSegmentIndex, safeEncounterIndex);

  if (encounterCategory === "boss") return getMonsterDefinition(pool.biomeBoss);

  if (encounterCategory === "elite") {
    const factionRole = ELITE_FACTION_PATTERN_BY_SEGMENT[safeSegmentIndex] ?? "dominant";
    const roster = pool[factionRole];
    return getMonsterDefinition(roster.elite);
  }

  const segmentPattern = NORMAL_FACTION_PATTERN_BY_SEGMENT[safeSegmentIndex]
    ?? NORMAL_FACTION_PATTERN_BY_SEGMENT[0];
  const factionRole = segmentPattern?.[safeEncounterIndex] ?? "dominant";
  const roster = pool[factionRole];
  const index = (safeSegmentIndex + safeEncounterIndex) % roster.normal.length;
  const monsterId = roster.normal[index] ?? roster.normal[0];
  if (monsterId === undefined) throw new Error(`Zone has no normal monsters: ${String(zoneDefId)}`);
  return getMonsterDefinition(monsterId);
}
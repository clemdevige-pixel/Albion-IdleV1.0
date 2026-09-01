import {
  AUTHORED_MONSTER_DEFINITIONS,
  ELITE_FACTION_PATTERN_BY_SEGMENT,
  ENCOUNTERS_PER_SEGMENT,
  MAX_MAGICAL_ENCOUNTERS_PER_SEGMENT,
  MONSTER_IDS,
  NORMAL_FACTION_PATTERN_BY_SEGMENT,
  SEGMENTS_PER_ZONE,
  ZONE_ENCOUNTER_POOLS as AUTHORED_ZONE_ENCOUNTER_POOLS,
  type AuthoredMonsterCategory,
  type AuthoredMonsterContentDefinition,
  type AuthoredZoneEncounterPool,
} from "@game/data";
import type { ZoneDefinitionId } from "@game/gameplay";

export type MonsterCategory = AuthoredMonsterCategory;
export interface MonsterContentDefinition extends AuthoredMonsterContentDefinition { readonly visualManifestId: string; }
export type FactionEncounterRoster = AuthoredZoneEncounterPool["dominant"];
export type ZoneEncounterPool = AuthoredZoneEncounterPool;
export { MAX_MAGICAL_ENCOUNTERS_PER_SEGMENT, MONSTER_IDS };

const MONSTER_PRESENTATION_BY_ID: Readonly<Record<string, string>> = {
  [MONSTER_IDS.morganaWitch]: "monster_morgana_witch",
  [MONSTER_IDS.morganaSuppressor]: "monster_morgana_suppressor",
  [MONSTER_IDS.morganaDarkKnight]: "monster_morgana_dark_knight",
  [MONSTER_IDS.morganaHighPriestess]: "boss_morgana_high_priestess",
  [MONSTER_IDS.undeadWarrior]: "monster_undead_warrior",
  [MONSTER_IDS.undeadSkeletonSwordsman]: "monster_undead_skeleton_swordsman",
  [MONSTER_IDS.undeadSkeletonArcher]: "monster_undead_skeleton_archer",
  [MONSTER_IDS.undeadSpectralKnight]: "monster_undead_spectral_knight",
  [MONSTER_IDS.undeadLich]: "boss_undead_lich",
  [MONSTER_IDS.keeperWarrior]: "monster_keeper_warrior",
  [MONSTER_IDS.keeperShaman]: "monster_keeper_shaman",
  [MONSTER_IDS.keeperChampion]: "monster_keeper_champion",
  [MONSTER_IDS.keeperAncient]: "boss_keeper_ancient",
  [MONSTER_IDS.hereticThug]: "monster_heretic_thug",
  [MONSTER_IDS.hereticFirestarter]: "monster_heretic_firestarter",
  [MONSTER_IDS.hereticEnforcer]: "monster_heretic_enforcer",
  [MONSTER_IDS.hereticMadmen]: "boss_heretic_madmen",
};

export const MONSTER_DEFINITIONS: Readonly<Record<string, MonsterContentDefinition>> = Object.fromEntries(
  Object.values(AUTHORED_MONSTER_DEFINITIONS).map((definition) => {
    const visualManifestId = MONSTER_PRESENTATION_BY_ID[definition.id];
    if (visualManifestId === undefined) throw new Error(`Missing monster presentation: ${definition.id}`);
    return [definition.id, { ...definition, visualManifestId }] as const;
  }),
);

export const ZONE_ENCOUNTER_POOLS: Readonly<Record<string, ZoneEncounterPool>> = AUTHORED_ZONE_ENCOUNTER_POOLS;

export function getMonsterDefinition(id: string): MonsterContentDefinition {
  const definition = MONSTER_DEFINITIONS[id];
  if (definition === undefined) throw new Error(`Unknown monster definition: ${id}`);
  return definition;
}

export function applyMonsterRewardModifiers(
  baseRewards: { readonly silver: number; readonly fame: number },
  _monster: MonsterContentDefinition,
): { readonly silver: number; readonly fame: number } {
  return {
    silver: Math.max(0, Math.round(baseRewards.silver)),
    fame: Math.max(0, Math.round(baseRewards.fame)),
  };
}

export function getZoneEncounterPool(zoneDefId: ZoneDefinitionId): ZoneEncounterPool {
  const pool = ZONE_ENCOUNTER_POOLS[String(zoneDefId)];
  if (pool === undefined) throw new Error(`Missing monster encounter pool for zone: ${String(zoneDefId)}`);
  return pool;
}

export function resolveEncounterCategory(segmentIndex: number, encounterIndex: number): "normal" | "elite" | "boss" {
  const safeSegmentIndex = Math.max(0, Math.min(SEGMENTS_PER_ZONE - 1, segmentIndex));
  const safeEncounterIndex = Math.max(0, Math.min(ENCOUNTERS_PER_SEGMENT - 1, encounterIndex));
  if (safeEncounterIndex !== ENCOUNTERS_PER_SEGMENT - 1) return "normal";
  return safeSegmentIndex === SEGMENTS_PER_ZONE - 1 ? "boss" : "elite";
}

function resolveNormalCandidate(pool: ZoneEncounterPool, segmentIndex: number, encounterIndex: number): MonsterContentDefinition {
  const segmentPattern = NORMAL_FACTION_PATTERN_BY_SEGMENT[segmentIndex] ?? NORMAL_FACTION_PATTERN_BY_SEGMENT[0];
  const factionRole = segmentPattern?.[encounterIndex] ?? "dominant";
  const roster = pool[factionRole];
  const index = (segmentIndex + encounterIndex) % roster.normal.length;
  const monsterId = roster.normal[index] ?? roster.normal[0];
  if (monsterId === undefined) throw new Error(`Zone faction ${roster.faction} has no normal monsters`);
  return getMonsterDefinition(monsterId);
}

function resolveTerminalMonster(pool: ZoneEncounterPool, segmentIndex: number): MonsterContentDefinition {
  if (segmentIndex === SEGMENTS_PER_ZONE - 1) return getMonsterDefinition(pool.biomeBoss);
  const factionRole = ELITE_FACTION_PATTERN_BY_SEGMENT[segmentIndex] ?? "dominant";
  return getMonsterDefinition(pool[factionRole].elite);
}

function resolvePhysicalFallback(pool: ZoneEncounterPool, segmentIndex: number, encounterIndex: number): MonsterContentDefinition {
  const segmentPattern = NORMAL_FACTION_PATTERN_BY_SEGMENT[segmentIndex] ?? NORMAL_FACTION_PATTERN_BY_SEGMENT[0];
  const factionRole = segmentPattern?.[encounterIndex] ?? "dominant";
  const roster = pool[factionRole];
  const physicalId = roster.normal.find((monsterId) => getMonsterDefinition(monsterId).combat.damageType === "physical");
  if (physicalId === undefined) {
    throw new Error(`Zone faction ${roster.faction} needs a physical normal monster to enforce the magical encounter cap`);
  }
  return getMonsterDefinition(physicalId);
}

function resolveCappedNormalMonster(pool: ZoneEncounterPool, segmentIndex: number, encounterIndex: number): MonsterContentDefinition {
  const candidate = resolveNormalCandidate(pool, segmentIndex, encounterIndex);
  if (candidate.combat.damageType !== "magical") return candidate;

  const terminalMagic = resolveTerminalMonster(pool, segmentIndex).combat.damageType === "magical" ? 1 : 0;
  const normalMagicBudget = Math.max(0, MAX_MAGICAL_ENCOUNTERS_PER_SEGMENT - terminalMagic);
  let usedMagic = 0;

  for (let priorIndex = 0; priorIndex < encounterIndex; priorIndex += 1) {
    const priorCandidate = resolveNormalCandidate(pool, segmentIndex, priorIndex);
    if (priorCandidate.combat.damageType !== "magical") continue;
    if (usedMagic < normalMagicBudget) usedMagic += 1;
  }

  return usedMagic < normalMagicBudget
    ? candidate
    : resolvePhysicalFallback(pool, segmentIndex, encounterIndex);
}

export function resolveMonsterForEncounter(
  zoneDefId: ZoneDefinitionId,
  segmentIndex: number,
  encounterIndex: number,
): MonsterContentDefinition {
  const pool = getZoneEncounterPool(zoneDefId);
  const safeSegmentIndex = Math.max(0, Math.min(SEGMENTS_PER_ZONE - 1, segmentIndex));
  const safeEncounterIndex = Math.max(0, Math.min(ENCOUNTERS_PER_SEGMENT - 1, encounterIndex));
  const encounterCategory = resolveEncounterCategory(safeSegmentIndex, safeEncounterIndex);
  if (encounterCategory === "boss") return getMonsterDefinition(pool.biomeBoss);
  if (encounterCategory === "elite") {
    const factionRole = ELITE_FACTION_PATTERN_BY_SEGMENT[safeSegmentIndex] ?? "dominant";
    return getMonsterDefinition(pool[factionRole].elite);
  }
  return resolveCappedNormalMonster(pool, safeSegmentIndex, safeEncounterIndex);
}

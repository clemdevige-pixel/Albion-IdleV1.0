import {
  SEGMENTS_PER_ZONE,
  ENCOUNTERS_PER_SEGMENT,
  ENCOUNTER_DIFFICULTY_GROWTH,
  REWARD_RANKS_PER_ZONE,
  WORLD_ONE_COMBAT_CURVE,
} from "@game/data";

export interface EnemyCombatProfile {
  readonly hp: number;
  readonly damage: number;
  readonly armor: number;
  readonly magicResistance: number;
  readonly attackSpeed: number;
}

export interface EncounterRewards {
  readonly silver: number;
  readonly fame: number;
}

export function getEnemyCombatProfile(
  zoneIndex: number,
  segmentIndex: number,
  encounterIndex: number,
): EnemyCombatProfile {
  const isBoss = encounterIndex === ENCOUNTERS_PER_SEGMENT - 1;
  const curve =
    WORLD_ONE_COMBAT_CURVE[zoneIndex]
    ?? WORLD_ONE_COMBAT_CURVE[WORLD_ONE_COMBAT_CURVE.length - 1]!;
  const segmentProgress =
    Math.max(0, Math.min(SEGMENTS_PER_ZONE - 1, segmentIndex))
    / (SEGMENTS_PER_ZONE - 1);
  const encounterScale =
    1 + encounterIndex * ENCOUNTER_DIFFICULTY_GROWTH;
  const interpolate = (start: number, end: number): number =>
    start + (end - start) * segmentProgress;
  const healthScale =
    interpolate(curve.healthStart, curve.healthEnd) * encounterScale;
  const damageScale =
    interpolate(curve.damageStart, curve.damageEnd) * encounterScale;
  const defenseScale =
    interpolate(curve.defenseStart, curve.defenseEnd);
  const baseHp = isBoss ? 520 : 300;
  const baseDmg = isBoss ? 26 : 15;
  const baseArmor = isBoss ? 12 : 5;

  return {
    hp: Math.floor(baseHp * healthScale),
    damage: Math.floor(baseDmg * damageScale),
    armor: Math.floor(baseArmor * defenseScale),
    magicResistance: Math.floor(3 * defenseScale),
    attackSpeed: 0.8,
  };
}

export function getEncounterRewards(
  zoneIndex: number,
  segmentIndex: number,
  encounterIndex: number,
): EncounterRewards {
  const progressionRank =
    zoneIndex * REWARD_RANKS_PER_ZONE +
    segmentIndex *
      ((REWARD_RANKS_PER_ZONE - 1) / (SEGMENTS_PER_ZONE - 1));
  const isBoss = encounterIndex === ENCOUNTERS_PER_SEGMENT - 1;
  const encounterMultiplier = isBoss ? 2 : 1;

  return {
    silver: Math.round(10 + progressionRank * 3) * encounterMultiplier,
    fame: Math.round(15 + progressionRank * 4) * encounterMultiplier,
  };
}

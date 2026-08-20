import {
  SEGMENTS_PER_ZONE,
  ENCOUNTERS_PER_SEGMENT,
  ENCOUNTER_DIFFICULTY_GROWTH,
  REWARD_RANKS_PER_ZONE,
  getWorldCombatProgression,
  type WorldBandId,
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

type EncounterCombatRank = "normal" | "elite" | "boss";

function getEncounterCombatRank(
  segmentIndex: number,
  encounterIndex: number,
): EncounterCombatRank {
  const safeSegmentIndex = Math.max(0, Math.min(SEGMENTS_PER_ZONE - 1, segmentIndex));
  const safeEncounterIndex = Math.max(0, Math.min(ENCOUNTERS_PER_SEGMENT - 1, encounterIndex));
  if (safeEncounterIndex !== ENCOUNTERS_PER_SEGMENT - 1) return "normal";
  return safeSegmentIndex === SEGMENTS_PER_ZONE - 1 ? "boss" : "elite";
}

export function getEnemyCombatProfile(
  zoneIndex: number,
  segmentIndex: number,
  encounterIndex: number,
  worldBandId: WorldBandId = "blue",
): EnemyCombatProfile {
  const rank = getEncounterCombatRank(segmentIndex, encounterIndex);
  const worldProgression = getWorldCombatProgression(worldBandId);
  const curve = worldProgression.curve[zoneIndex];
  if (curve === undefined) {
    throw new RangeError(
      `Missing combat curve for ${worldBandId} zone index ${String(zoneIndex)}`,
    );
  }
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

  // Encounter 5 on segments 1..9 is an elite, not a biome boss. The old
  // profile treated both as bosses, creating a large artificial spike every
  // segment. Final segment encounter 5 retains the real boss envelope.
  const baseHp = rank === "boss" ? 520 : rank === "elite" ? 390 : 300;
  const baseDmg = rank === "boss" ? 26 : rank === "elite" ? 19 : 15;
  const baseArmor = rank === "boss" ? 12 : rank === "elite" ? 8 : 5;
  const baseMagicResistance = curve.defenseModel === "rank_parity" ? baseArmor : 3;
  const bossGate = rank === "boss" && curve.bossGate?.progressionRole === "boss_gate"
    ? curve.bossGate
    : undefined;
  const bossHealthMultiplier = bossGate?.healthMultiplier ?? 1;
  const bossDamageMultiplier = bossGate?.damageMultiplier ?? 1;
  const bossDefenseMultiplier = bossGate?.defenseMultiplier ?? 1;

  return {
    hp: Math.floor(baseHp * healthScale * bossHealthMultiplier),
    damage: Math.floor(baseDmg * damageScale * bossDamageMultiplier),
    armor: Math.floor(baseArmor * defenseScale * bossDefenseMultiplier),
    magicResistance: Math.floor(baseMagicResistance * defenseScale * bossDefenseMultiplier),
    attackSpeed: 0.8,
  };
}

export function getEncounterRewards(
  zoneIndex: number,
  segmentIndex: number,
  encounterIndex: number,
  worldBandId: WorldBandId = "blue",
): EncounterRewards {
  const worldProgression = getWorldCombatProgression(worldBandId);
  const progressionRank =
    worldProgression.rewardRankOffset
    + zoneIndex * REWARD_RANKS_PER_ZONE +
    segmentIndex *
      ((REWARD_RANKS_PER_ZONE - 1) / (SEGMENTS_PER_ZONE - 1));
  const isBossEncounter = encounterIndex === ENCOUNTERS_PER_SEGMENT - 1;
  const encounterMultiplier = isBossEncounter ? 2 : 1;

  return {
    silver: Math.round(10 + progressionRank * 3) * encounterMultiplier,
    fame: Math.round(15 + progressionRank * 4) * encounterMultiplier,
  };
}

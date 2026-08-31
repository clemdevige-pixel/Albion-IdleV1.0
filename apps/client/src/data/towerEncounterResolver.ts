import {
  TOWER_DIFFICULTY_ZERO_COMBAT_MULTIPLIER,
  TOWER_DUNGEON_ENCOUNTER_INDEX_BY_FLOOR_INDEX,
  TOWER_REINFORCED_COMBAT_MULTIPLIERS,
  TOWER_TRIAL_BLOCK_COMBAT_MULTIPLIERS,
  getTowerDepthDifficultyMultiplier,
  type TowerFactionId,
  type TowerTier,
} from "@game/data";
import { getTowerFloorDefinition, type TowerFloorDefinition } from "@game/gameplay";
import {
  DUNGEON_DEFINITIONS,
  resolveDungeonCombatProfile,
} from "./dungeonContentCatalog.js";
import { applyTowerFactionCombatNormalization } from "./towerCombatNormalization.js";
import type { AuthoredEnemyCombatProfile } from "../runtime/combatEntityFactory.js";

export interface ResolvedTowerEncounter {
  readonly status: "resolved";
  readonly floorDefinition: TowerFloorDefinition;
  readonly dungeonDefinitionId: string;
  readonly dungeonEncounterIndex: number;
  readonly encounterId: string;
  readonly encounterKind: "normal" | "elite" | "boss";
  readonly monsterDefinitionId: string;
  readonly combatProfile: AuthoredEnemyCombatProfile;
}

export interface ResolvedTowerDifficultyZeroEncounter {
  readonly tier: TowerTier;
  readonly factionId: TowerFactionId;
  readonly indexInBlock: number;
  readonly dungeonDefinitionId: string;
  readonly dungeonEncounterIndex: number;
  readonly encounterId: string;
  readonly encounterKind: "normal" | "elite" | "boss";
  readonly monsterDefinitionId: string;
  readonly combatProfile: AuthoredEnemyCombatProfile;
}

function applyTowerRoleCombatTuning(
  reinforced: boolean,
  profile: AuthoredEnemyCombatProfile,
): AuthoredEnemyCombatProfile {
  if (!reinforced) return profile;

  return {
    hp: Math.round(profile.hp * TOWER_REINFORCED_COMBAT_MULTIPLIERS.hp),
    damage: Math.round(profile.damage * TOWER_REINFORCED_COMBAT_MULTIPLIERS.damage),
    attackSpeed: profile.attackSpeed,
    armor: Math.round(profile.armor * TOWER_REINFORCED_COMBAT_MULTIPLIERS.defense),
    magicResistance: Math.round(
      profile.magicResistance * TOWER_REINFORCED_COMBAT_MULTIPLIERS.defense,
    ),
  };
}

function applyTowerDifficultyZeroCalibration(
  tier: TowerTier,
  factionId: TowerFactionId,
  profile: AuthoredEnemyCombatProfile,
): AuthoredEnemyCombatProfile {
  const multiplier = TOWER_DIFFICULTY_ZERO_COMBAT_MULTIPLIER[factionId][tier];
  if (multiplier === 1) return profile;

  return {
    hp: Math.max(1, Math.round(profile.hp * multiplier)),
    damage: Math.max(1, Math.round(profile.damage * multiplier)),
    attackSpeed: profile.attackSpeed,
    armor: Math.max(0, Math.round(profile.armor * multiplier)),
    magicResistance: Math.max(0, Math.round(profile.magicResistance * multiplier)),
  };
}

function applyTowerTrialBlockCombatTuning(
  floorDefinition: TowerFloorDefinition,
  profile: AuthoredEnemyCombatProfile,
): AuthoredEnemyCombatProfile {
  const multipliers = TOWER_TRIAL_BLOCK_COMBAT_MULTIPLIERS[floorDefinition.block.id];
  if (multipliers === undefined) return profile;

  return {
    hp: Math.round(profile.hp * multipliers.hp),
    damage: Math.round(profile.damage * multipliers.damage),
    attackSpeed: profile.attackSpeed,
    armor: profile.armor,
    magicResistance: profile.magicResistance,
  };
}

function applyTowerDepthCombatScaling(
  floorDefinition: TowerFloorDefinition,
  profile: AuthoredEnemyCombatProfile,
): AuthoredEnemyCombatProfile {
  const multiplier = getTowerDepthDifficultyMultiplier(floorDefinition.floor);
  if (multiplier === 1) return profile;

  return {
    hp: Math.round(profile.hp * multiplier),
    damage: Math.round(profile.damage * multiplier),
    attackSpeed: profile.attackSpeed,
    armor: Math.round(profile.armor * multiplier),
    magicResistance: Math.round(profile.magicResistance * multiplier),
  };
}

/**
 * Canonical Tower Difficulty 0 encounter.
 *
 * Dungeon content stays canonical. Tower applies faction/tier normalization,
 * floor-role tuning, then the accepted Difficulty 0 calibration measured by the
 * fine sweep. Trial-specific and Endless depth tuning are intentionally absent.
 */
export function resolveTowerDifficultyZeroEncounter(
  tier: TowerTier,
  factionId: TowerFactionId,
  indexInBlock: number,
): ResolvedTowerDifficultyZeroEncounter {
  const dungeonEncounterIndex = TOWER_DUNGEON_ENCOUNTER_INDEX_BY_FLOOR_INDEX[indexInBlock];
  if (dungeonEncounterIndex === undefined) {
    throw new Error(`Missing Tower encounter mapping for floor index ${String(indexInBlock)}`);
  }

  const dungeon = DUNGEON_DEFINITIONS.find((definition) => (
    definition.tier === tier && definition.faction.toLowerCase() === factionId
  ));
  if (dungeon === undefined) {
    throw new Error(`Missing faction Dungeon for Tower ${factionId} T${String(tier)}`);
  }

  const encounter = dungeon.encounters[dungeonEncounterIndex];
  if (encounter === undefined) {
    throw new Error(
      `Missing Dungeon encounter ${String(dungeonEncounterIndex)} for Tower source ${dungeon.id}`,
    );
  }

  const baseCombatProfile = resolveDungeonCombatProfile({
    dungeonDefinitionId: dungeon.id,
    encounterIndex: dungeonEncounterIndex,
    monsterDefinitionId: encounter.monsterDefinitionId,
  });
  const normalizedProfile = applyTowerFactionCombatNormalization(
    { factionId, tier },
    baseCombatProfile,
  );
  const roleTunedProfile = applyTowerRoleCombatTuning(indexInBlock === 2, normalizedProfile);

  return {
    tier,
    factionId,
    indexInBlock,
    dungeonDefinitionId: dungeon.id,
    dungeonEncounterIndex,
    encounterId: encounter.id,
    encounterKind: encounter.kind,
    monsterDefinitionId: encounter.monsterDefinitionId,
    combatProfile: applyTowerDifficultyZeroCalibration(tier, factionId, roleTunedProfile),
  };
}

/**
 * Resolves a live Tower floor from Difficulty 0, then applies any authored trial
 * tuning and finally the canonical Endless depth scaling.
 */
export function resolveTowerEncounter(
  floor: number,
  towerSeed: string,
): ResolvedTowerEncounter {
  const floorDefinition = getTowerFloorDefinition(floor, towerSeed);
  const baseEncounter = resolveTowerDifficultyZeroEncounter(
    floorDefinition.block.tier,
    floorDefinition.block.factionId,
    floorDefinition.indexInBlock,
  );
  const trialBlockTunedProfile = applyTowerTrialBlockCombatTuning(
    floorDefinition,
    baseEncounter.combatProfile,
  );

  return {
    status: "resolved",
    floorDefinition,
    dungeonDefinitionId: baseEncounter.dungeonDefinitionId,
    dungeonEncounterIndex: baseEncounter.dungeonEncounterIndex,
    encounterId: baseEncounter.encounterId,
    encounterKind: baseEncounter.encounterKind,
    monsterDefinitionId: baseEncounter.monsterDefinitionId,
    combatProfile: applyTowerDepthCombatScaling(floorDefinition, trialBlockTunedProfile),
  };
}

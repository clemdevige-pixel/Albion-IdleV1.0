import { getEnemyCombatProfile, type DungeonDefinition } from "@game/gameplay";
import { MONSTER_IDS } from "./monsterContentCatalog.js";
import type { AuthoredEnemyCombatProfile } from "../runtime/combatEntityFactory.js";

export const KEEPER_T4_DUNGEON_ID = "dungeon_keeper_t4";

/**
 * First authored dungeon pilot.
 * Structure follows the validated V1 contract:
 * Normal -> Normal -> Elite -> Normal -> Boss.
 */
export const KEEPER_T4_DUNGEON: DungeonDefinition = {
  id: KEEPER_T4_DUNGEON_ID,
  tier: 4,
  faction: "Keeper",
  keyItemId: "item_resource_dungeon_key_keeper",
  encounters: [
    { id: "keeper_t4_normal_1", kind: "normal", monsterDefinitionId: MONSTER_IDS.keeperWarrior },
    { id: "keeper_t4_normal_2", kind: "normal", monsterDefinitionId: MONSTER_IDS.keeperShaman },
    { id: "keeper_t4_elite", kind: "elite", monsterDefinitionId: MONSTER_IDS.keeperChampion },
    { id: "keeper_t4_normal_3", kind: "normal", monsterDefinitionId: MONSTER_IDS.keeperWarrior },
    { id: "keeper_t4_boss", kind: "boss", monsterDefinitionId: MONSTER_IDS.keeperAncient },
  ],
};

/**
 * T4 dungeon combat is anchored to Mountain S10 rather than absolute numbers.
 * This keeps the dungeon coupled to the real Blue endgame baseline while still
 * authoring an explicit 4.3+ pressure curve.
 */
const KEEPER_T4_PROFILE_STEPS = [
  { sourceSegmentIndex: 9, sourceEncounterIndex: 0, hp: 1.05, damage: 1.05, defense: 1.02 },
  { sourceSegmentIndex: 9, sourceEncounterIndex: 1, hp: 1.08, damage: 1.08, defense: 1.04 },
  { sourceSegmentIndex: 8, sourceEncounterIndex: 4, hp: 1.1, damage: 1.1, defense: 1.06 },
  { sourceSegmentIndex: 9, sourceEncounterIndex: 2, hp: 1.12, damage: 1.12, defense: 1.08 },
  { sourceSegmentIndex: 9, sourceEncounterIndex: 4, hp: 1.15, damage: 1.15, defense: 1.1 },
] as const;

export function resolveKeeperT4DungeonCombatProfile(input: {
  readonly dungeonDefinitionId: string;
  readonly encounterIndex: number;
  readonly monsterDefinitionId: string;
}): AuthoredEnemyCombatProfile {
  if (input.dungeonDefinitionId !== KEEPER_T4_DUNGEON_ID) {
    throw new Error(`Unsupported dungeon combat profile: ${input.dungeonDefinitionId}`);
  }
  const step = KEEPER_T4_PROFILE_STEPS[input.encounterIndex];
  if (step === undefined) {
    throw new Error(`Invalid Keeper T4 dungeon encounter index: ${String(input.encounterIndex)}`);
  }

  const base = getEnemyCombatProfile(
    4,
    step.sourceSegmentIndex,
    step.sourceEncounterIndex,
    "blue",
  );

  return {
    maxHealth: Math.round(base.hp * step.hp),
    damage: Math.round(base.damage * step.damage),
    attackSpeed: base.attackSpeed,
    armor: Math.round(base.armor * step.defense),
    magicResistance: Math.round(base.magicResistance * step.defense),
  };
}

export const DUNGEON_DEFINITIONS = [KEEPER_T4_DUNGEON] as const;

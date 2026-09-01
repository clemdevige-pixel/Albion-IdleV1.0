import {
  DUNGEON_COMBAT_SOURCES,
  DUNGEON_DEFINITIONS as AUTHORED_DUNGEON_DEFINITIONS,
  DUNGEON_ENCOUNTER_BALANCE_BY_ID,
  FACTION_T4_COMBAT_PROFILE_ID,
  FACTION_T5_COMBAT_PROFILE_ID,
  FACTION_T6_COMBAT_PROFILE_ID,
  FACTION_T7_COMBAT_PROFILE_ID,
  FACTION_T8_COMBAT_PROFILE_ID,
  HERETIC_T4_DUNGEON,
  HERETIC_T4_DUNGEON_ID,
  HERETIC_T4_LOOT_TABLE_ID,
  HERETIC_T5_DUNGEON,
  HERETIC_T5_DUNGEON_ID,
  HERETIC_T5_LOOT_TABLE_ID,
  HERETIC_T6_DUNGEON,
  HERETIC_T6_DUNGEON_ID,
  HERETIC_T6_LOOT_TABLE_ID,
  HERETIC_T7_DUNGEON,
  HERETIC_T7_DUNGEON_ID,
  HERETIC_T7_LOOT_TABLE_ID,
  HERETIC_T8_DUNGEON,
  HERETIC_T8_DUNGEON_ID,
  HERETIC_T8_LOOT_TABLE_ID,
  KEEPER_T4_DUNGEON,
  KEEPER_T4_DUNGEON_ID,
  KEEPER_T4_LOOT_TABLE_ID,
  KEEPER_T5_DUNGEON,
  KEEPER_T5_DUNGEON_ID,
  KEEPER_T5_LOOT_TABLE_ID,
  KEEPER_T6_DUNGEON,
  KEEPER_T6_DUNGEON_ID,
  KEEPER_T6_LOOT_TABLE_ID,
  KEEPER_T7_DUNGEON,
  KEEPER_T7_DUNGEON_ID,
  KEEPER_T7_LOOT_TABLE_ID,
  KEEPER_T8_DUNGEON,
  KEEPER_T8_DUNGEON_ID,
  KEEPER_T8_LOOT_TABLE_ID,
  MORGANA_T4_DUNGEON,
  MORGANA_T4_DUNGEON_ID,
  MORGANA_T4_LOOT_TABLE_ID,
  MORGANA_T5_DUNGEON,
  MORGANA_T5_DUNGEON_ID,
  MORGANA_T5_LOOT_TABLE_ID,
  MORGANA_T6_DUNGEON,
  MORGANA_T6_DUNGEON_ID,
  MORGANA_T6_LOOT_TABLE_ID,
  MORGANA_T7_DUNGEON,
  MORGANA_T7_DUNGEON_ID,
  MORGANA_T7_LOOT_TABLE_ID,
  MORGANA_T8_DUNGEON,
  MORGANA_T8_DUNGEON_ID,
  MORGANA_T8_LOOT_TABLE_ID,
  UNDEAD_T4_DUNGEON,
  UNDEAD_T4_DUNGEON_ID,
  UNDEAD_T4_LOOT_TABLE_ID,
  UNDEAD_T5_DUNGEON,
  UNDEAD_T5_DUNGEON_ID,
  UNDEAD_T5_LOOT_TABLE_ID,
  UNDEAD_T6_DUNGEON,
  UNDEAD_T6_DUNGEON_ID,
  UNDEAD_T6_LOOT_TABLE_ID,
  UNDEAD_T7_DUNGEON,
  UNDEAD_T7_DUNGEON_ID,
  UNDEAD_T7_LOOT_TABLE_ID,
  UNDEAD_T8_DUNGEON,
  UNDEAD_T8_DUNGEON_ID,
  UNDEAD_T8_LOOT_TABLE_ID,
} from "@game/data";
import { getEnemyCombatProfile, type DungeonDefinition } from "@game/gameplay";
import type { AuthoredEnemyCombatProfile } from "../runtime/combatEntityFactory.js";

export {
  FACTION_T4_COMBAT_PROFILE_ID,
  FACTION_T5_COMBAT_PROFILE_ID,
  FACTION_T6_COMBAT_PROFILE_ID,
  FACTION_T7_COMBAT_PROFILE_ID,
  FACTION_T8_COMBAT_PROFILE_ID,
  HERETIC_T4_DUNGEON,
  HERETIC_T4_DUNGEON_ID,
  HERETIC_T4_LOOT_TABLE_ID,
  HERETIC_T5_DUNGEON,
  HERETIC_T5_DUNGEON_ID,
  HERETIC_T5_LOOT_TABLE_ID,
  HERETIC_T6_DUNGEON,
  HERETIC_T6_DUNGEON_ID,
  HERETIC_T6_LOOT_TABLE_ID,
  HERETIC_T7_DUNGEON,
  HERETIC_T7_DUNGEON_ID,
  HERETIC_T7_LOOT_TABLE_ID,
  HERETIC_T8_DUNGEON,
  HERETIC_T8_DUNGEON_ID,
  HERETIC_T8_LOOT_TABLE_ID,
  KEEPER_T4_DUNGEON,
  KEEPER_T4_DUNGEON_ID,
  KEEPER_T4_LOOT_TABLE_ID,
  KEEPER_T5_DUNGEON,
  KEEPER_T5_DUNGEON_ID,
  KEEPER_T5_LOOT_TABLE_ID,
  KEEPER_T6_DUNGEON,
  KEEPER_T6_DUNGEON_ID,
  KEEPER_T6_LOOT_TABLE_ID,
  KEEPER_T7_DUNGEON,
  KEEPER_T7_DUNGEON_ID,
  KEEPER_T7_LOOT_TABLE_ID,
  KEEPER_T8_DUNGEON,
  KEEPER_T8_DUNGEON_ID,
  KEEPER_T8_LOOT_TABLE_ID,
  MORGANA_T4_DUNGEON,
  MORGANA_T4_DUNGEON_ID,
  MORGANA_T4_LOOT_TABLE_ID,
  MORGANA_T5_DUNGEON,
  MORGANA_T5_DUNGEON_ID,
  MORGANA_T5_LOOT_TABLE_ID,
  MORGANA_T6_DUNGEON,
  MORGANA_T6_DUNGEON_ID,
  MORGANA_T6_LOOT_TABLE_ID,
  MORGANA_T7_DUNGEON,
  MORGANA_T7_DUNGEON_ID,
  MORGANA_T7_LOOT_TABLE_ID,
  MORGANA_T8_DUNGEON,
  MORGANA_T8_DUNGEON_ID,
  MORGANA_T8_LOOT_TABLE_ID,
  UNDEAD_T4_DUNGEON,
  UNDEAD_T4_DUNGEON_ID,
  UNDEAD_T4_LOOT_TABLE_ID,
  UNDEAD_T5_DUNGEON,
  UNDEAD_T5_DUNGEON_ID,
  UNDEAD_T5_LOOT_TABLE_ID,
  UNDEAD_T6_DUNGEON,
  UNDEAD_T6_DUNGEON_ID,
  UNDEAD_T6_LOOT_TABLE_ID,
  UNDEAD_T7_DUNGEON,
  UNDEAD_T7_DUNGEON_ID,
  UNDEAD_T7_LOOT_TABLE_ID,
  UNDEAD_T8_DUNGEON,
  UNDEAD_T8_DUNGEON_ID,
  UNDEAD_T8_LOOT_TABLE_ID,
};

/** @deprecated T4 faction dungeons share the same world-source profile. */
export const KEEPER_T4_COMBAT_PROFILE_ID = FACTION_T4_COMBAT_PROFILE_ID;

export const DUNGEON_DEFINITIONS: readonly DungeonDefinition[] = AUTHORED_DUNGEON_DEFINITIONS;

const DUNGEON_DEFINITION_BY_ID: Readonly<Record<string, DungeonDefinition>> = Object.fromEntries(
  DUNGEON_DEFINITIONS.map((definition) => [definition.id, definition]),
);

export function getDungeonDefinition(dungeonDefinitionId: string): DungeonDefinition {
  const definition = DUNGEON_DEFINITION_BY_ID[dungeonDefinitionId];
  if (definition === undefined) throw new Error(`Unknown dungeon definition: ${dungeonDefinitionId}`);
  return definition;
}

export function resolveDungeonCombatProfile(input: {
  readonly dungeonDefinitionId: string;
  readonly encounterIndex: number;
  readonly monsterDefinitionId: string;
}): AuthoredEnemyCombatProfile {
  const dungeon = getDungeonDefinition(input.dungeonDefinitionId);
  const source = DUNGEON_COMBAT_SOURCES[dungeon.combatProfileId];
  if (source === undefined) throw new Error(`Unknown dungeon combat source: ${dungeon.combatProfileId}`);
  const balanceSteps = DUNGEON_ENCOUNTER_BALANCE_BY_ID[dungeon.id];
  if (balanceSteps === undefined) throw new Error(`Missing authored dungeon balance: ${dungeon.id}`);
  const step = balanceSteps[input.encounterIndex];
  if (step === undefined) throw new Error(`Invalid dungeon encounter index: ${String(input.encounterIndex)} for ${dungeon.id}`);
  const authoredEncounter = dungeon.encounters[input.encounterIndex];
  if (authoredEncounter?.monsterDefinitionId !== input.monsterDefinitionId) {
    throw new Error(`Dungeon encounter monster mismatch for ${dungeon.id} at ${String(input.encounterIndex)}`);
  }
  const base = getEnemyCombatProfile(
    source.sourceZoneIndexWithinBand,
    step.sourceSegmentIndex,
    step.sourceEncounterIndex,
    source.bandId,
  );
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

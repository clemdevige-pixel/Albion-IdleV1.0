import { getEnemyCombatProfile, type DungeonDefinition } from "@game/gameplay";
import type { WorldBandId } from "@game/data";
import { MONSTER_IDS } from "./monsterContentCatalog.js";
import type { AuthoredEnemyCombatProfile } from "../runtime/combatEntityFactory.js";

export const KEEPER_T4_DUNGEON_ID = "dungeon_keeper_t4";
export const KEEPER_T4_COMBAT_PROFILE_ID = "dungeon_combat_keeper_t4";
export const KEEPER_T4_LOOT_TABLE_ID = "dungeon_loot_keeper_t4";

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

const KEEPER_T4_COMBAT_PROFILE: DungeonCombatProfileDefinition = {
  id: KEEPER_T4_COMBAT_PROFILE_ID,
  bandId: "blue",
  sourceZoneIndexWithinBand: 4,
  steps: [
    { sourceSegmentIndex: 9, sourceEncounterIndex: 0, hp: 1.05, damage: 1.05, defense: 1.02 },
    { sourceSegmentIndex: 9, sourceEncounterIndex: 1, hp: 1.08, damage: 1.08, defense: 1.04 },
    { sourceSegmentIndex: 8, sourceEncounterIndex: 4, hp: 1.1, damage: 1.1, defense: 1.06 },
    { sourceSegmentIndex: 9, sourceEncounterIndex: 2, hp: 1.12, damage: 1.12, defense: 1.08 },
    { sourceSegmentIndex: 9, sourceEncounterIndex: 4, hp: 1.15, damage: 1.15, defense: 1.1 },
  ],
};

const DUNGEON_COMBAT_PROFILES: Readonly<Record<string, DungeonCombatProfileDefinition>> = {
  [KEEPER_T4_COMBAT_PROFILE.id]: KEEPER_T4_COMBAT_PROFILE,
};

export const KEEPER_T4_DUNGEON: DungeonDefinition = {
  id: KEEPER_T4_DUNGEON_ID,
  tier: 4,
  faction: "Keeper",
  keyItemId: "item_resource_dungeon_key_keeper",
  combatProfileId: KEEPER_T4_COMBAT_PROFILE_ID,
  lootTableId: KEEPER_T4_LOOT_TABLE_ID,
  encounters: [
    { id: "keeper_t4_normal_1", kind: "normal", monsterDefinitionId: MONSTER_IDS.keeperWarrior },
    { id: "keeper_t4_normal_2", kind: "normal", monsterDefinitionId: MONSTER_IDS.keeperShaman },
    { id: "keeper_t4_elite", kind: "elite", monsterDefinitionId: MONSTER_IDS.keeperChampion },
    { id: "keeper_t4_normal_3", kind: "normal", monsterDefinitionId: MONSTER_IDS.keeperWarrior },
    { id: "keeper_t4_boss", kind: "boss", monsterDefinitionId: MONSTER_IDS.keeperAncient },
  ],
};

export const DUNGEON_DEFINITIONS = [KEEPER_T4_DUNGEON] as const;

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
  const profile = DUNGEON_COMBAT_PROFILES[dungeon.combatProfileId];
  if (profile === undefined) {
    throw new Error(`Unknown dungeon combat profile: ${dungeon.combatProfileId}`);
  }

  const step = profile.steps[input.encounterIndex];
  if (step === undefined) {
    throw new Error(`Invalid dungeon encounter index: ${String(input.encounterIndex)} for ${dungeon.id}`);
  }

  const authoredEncounter = dungeon.encounters[input.encounterIndex];
  if (authoredEncounter?.monsterDefinitionId !== input.monsterDefinitionId) {
    throw new Error(`Dungeon encounter monster mismatch for ${dungeon.id} at ${String(input.encounterIndex)}`);
  }

  const base = getEnemyCombatProfile(
    profile.sourceZoneIndexWithinBand,
    step.sourceSegmentIndex,
    step.sourceEncounterIndex,
    profile.bandId,
  );

  return {
    hp: Math.round(base.hp * step.hp),
    damage: Math.round(base.damage * step.damage),
    attackSpeed: base.attackSpeed,
    armor: Math.round(base.armor * step.defense),
    magicResistance: Math.round(base.magicResistance * step.defense),
  };
}

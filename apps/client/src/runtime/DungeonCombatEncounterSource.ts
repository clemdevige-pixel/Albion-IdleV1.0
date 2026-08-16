import type { DungeonRuntime } from "@game/gameplay";
import {
  spawnAuthoredEnemy,
  type AuthoredEnemyCombatProfile,
  type CombatEntityFactoryDependencies,
  type SpawnedEnemyResult,
} from "./combatEntityFactory.js";

export type DungeonCombatProfileResolver = (input: {
  readonly dungeonDefinitionId: string;
  readonly encounterIndex: number;
  readonly monsterDefinitionId: string;
}) => AuthoredEnemyCombatProfile;

/**
 * Bridges DungeonRuntime encounter state into the existing combat entity
 * factory. It owns no combat loop and no progression state: it only resolves
 * the currently-authored monster + combat profile into a normal spawned enemy.
 */
export class DungeonCombatEncounterSource {
  constructor(
    private readonly dungeonRuntime: DungeonRuntime,
    private readonly resolveCombatProfile: DungeonCombatProfileResolver,
  ) {}

  spawnCurrentEncounter(
    deps: CombatEntityFactoryDependencies,
  ): SpawnedEnemyResult | undefined {
    const run = this.dungeonRuntime.activeRun;
    const encounter = this.dungeonRuntime.getActiveEncounter();
    if (run === undefined || run.status !== "active" || encounter === undefined) return undefined;

    const profile = this.resolveCombatProfile({
      dungeonDefinitionId: run.definitionId,
      encounterIndex: run.encounterIndex,
      monsterDefinitionId: encounter.monsterDefinitionId,
    });

    return spawnAuthoredEnemy(deps, {
      monsterDefinitionId: encounter.monsterDefinitionId,
      profile,
      contextLabel: `Dungeon ${run.definitionId}`,
    });
  }
}

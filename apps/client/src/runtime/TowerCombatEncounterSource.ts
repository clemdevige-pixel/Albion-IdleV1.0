import type { TowerProgressionService } from "@game/gameplay";
import { resolveTowerEncounter } from "../data/towerEncounterResolver.js";
import {
  spawnAuthoredEnemy,
  type CombatEntityFactoryDependencies,
  type SpawnedEnemyResult,
} from "./combatEntityFactory.js";

/**
 * Bridges the persisted Tower floor into the shared combat entity factory.
 * It owns no progression rule, encounter data, or balance values.
 */
export class TowerCombatEncounterSource {
  public constructor(private readonly progression: TowerProgressionService) {}

  public spawnCurrentFloor(
    deps: CombatEntityFactoryDependencies,
  ): SpawnedEnemyResult {
    const snapshot = this.progression.getSnapshot();
    const encounter = resolveTowerEncounter(snapshot.currentFloor, snapshot.seed);
    return spawnAuthoredEnemy(deps, {
      monsterDefinitionId: encounter.monsterDefinitionId,
      profile: encounter.combatProfile,
    });
  }
}

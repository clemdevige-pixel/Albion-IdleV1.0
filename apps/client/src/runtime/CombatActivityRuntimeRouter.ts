import type { FactionCombatContext } from "../data/factionCombatResolver.js";
import type {
  CombatEntityFactoryDependencies,
  SpawnedEnemyResult,
} from "./combatEntityFactory.js";
import type { CombatFlowPolicy } from "./CombatFlowPolicy.js";
import type { DungeonCombatRuntimeRouter, CombatVictoryResult } from "./DungeonCombatRuntimeRouter.js";
import type { TowerCombatRuntimeRouter } from "./TowerCombatRuntimeRouter.js";

/**
 * Single activity selector for the shared combat runtime.
 *
 * Tower and Dungeon remain independent activity authorities. This router only
 * selects which active activity currently overrides World combat, preventing
 * GameContext from duplicating activity-precedence and fallback rules.
 */
export class CombatActivityRuntimeRouter {
  readonly flowPolicy: CombatFlowPolicy;

  public constructor(
    private readonly dungeon: DungeonCombatRuntimeRouter,
    private readonly tower: TowerCombatRuntimeRouter,
  ) {
    this.flowPolicy = {
      shouldRestoreHeroHealthBeforeEncounter: (context) => (
        this.tower.isTowerActive()
          ? this.tower.flowPolicy.shouldRestoreHeroHealthBeforeEncounter(context)
          : this.dungeon.flowPolicy.shouldRestoreHeroHealthBeforeEncounter(context)
      ),
      shouldResetHeroCooldownsOnEncounterStart: (context) => (
        this.tower.isTowerActive()
          ? this.tower.flowPolicy.shouldResetHeroCooldownsOnEncounterStart(context)
          : this.dungeon.flowPolicy.shouldResetHeroCooldownsOnEncounterStart(context)
      ),
    };
  }

  public isTowerActive(): boolean {
    return this.tower.isTowerActive();
  }

  public isDungeonActive(): boolean {
    return this.dungeon.isDungeonActive();
  }

  public isActivityActive(): boolean {
    return this.isTowerActive() || this.isDungeonActive();
  }

  public canStartTower(): boolean {
    return !this.isDungeonActive() && !this.isTowerActive();
  }

  public getFactionCombatContext(): FactionCombatContext | undefined {
    const towerContext = this.tower.getFactionCombatContext();
    if (towerContext !== undefined) return { ...towerContext, activity: "tower" };
    const dungeonContext = this.dungeon.getFactionCombatContext();
    return dungeonContext === undefined
      ? undefined
      : { ...dungeonContext, activity: "dungeon" };
  }

  public spawnEnemyOverride(
    deps: CombatEntityFactoryDependencies,
  ): SpawnedEnemyResult | undefined {
    return this.tower.spawnEnemyOverride(deps)
      ?? this.dungeon.spawnEnemyOverride(deps);
  }

  public getEncounterIndex(worldEncounterIndex: number): number {
    if (this.tower.isTowerActive()) return this.tower.getEncounterIndex(worldEncounterIndex);
    return this.dungeon.getEncounterIndex(worldEncounterIndex);
  }

  public onVictory(worldVictory: () => CombatVictoryResult): CombatVictoryResult {
    if (this.tower.isTowerActive()) {
      return this.tower.onVictory(() => this.dungeon.onVictory(worldVictory));
    }
    return this.dungeon.onVictory(worldVictory);
  }

  public onDefeat(worldDefeat: () => void): void {
    if (this.tower.isTowerActive()) {
      this.tower.onDefeat(() => this.dungeon.onDefeat(worldDefeat));
      return;
    }
    this.dungeon.onDefeat(worldDefeat);
  }
}

import type { TowerProgressionService } from "@game/gameplay";
import {
  CONTINUOUS_COMBAT_FLOW_POLICY,
  type CombatFlowPolicy,
} from "./CombatFlowPolicy.js";
import type {
  CombatEntityFactoryDependencies,
  SpawnedEnemyResult,
} from "./combatEntityFactory.js";
import type { TowerCombatEncounterSource } from "./TowerCombatEncounterSource.js";

export interface TowerVictoryResult {
  readonly enteredNewSegment: false;
}

/**
 * Runtime-only Tower activity router.
 *
 * Active/inactive attempt state is intentionally transient. Persistent floor,
 * checkpoint and Endless unlock state remain owned by TowerProgressionService.
 */
export class TowerCombatRuntimeRouter {
  readonly flowPolicy: CombatFlowPolicy = CONTINUOUS_COMBAT_FLOW_POLICY;
  private active = false;

  public constructor(
    private readonly progression: TowerProgressionService,
    private readonly encounterSource: TowerCombatEncounterSource,
  ) {}

  public isTowerActive(): boolean {
    return this.active;
  }

  public start(): boolean {
    if (this.active) return false;
    this.active = true;
    return true;
  }

  public abandon(): boolean {
    if (!this.active) return false;
    this.active = false;
    return true;
  }

  public spawnEnemyOverride(
    deps: CombatEntityFactoryDependencies,
  ): SpawnedEnemyResult | undefined {
    if (!this.active) return undefined;
    return this.encounterSource.spawnCurrentFloor(deps);
  }

  public getEncounterIndex(worldEncounterIndex: number): number {
    if (!this.active) return worldEncounterIndex;
    return (this.progression.getSnapshot().currentFloor - 1) % 5;
  }

  public onVictory(fallback: () => TowerVictoryResult): TowerVictoryResult {
    if (!this.active) return fallback();
    const floor = this.progression.getSnapshot().currentFloor;
    this.progression.clearCurrentFloor(floor);
    return { enteredNewSegment: false };
  }

  public onDefeat(fallback: () => void): void {
    if (!this.active) {
      fallback();
      return;
    }
    this.progression.failCurrentFloor();
    this.active = false;
  }
}

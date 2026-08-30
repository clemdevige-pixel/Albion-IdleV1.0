import { TOWER_BLOCK_SIZE, TOWER_TRIAL_FLOOR_COUNT } from "@game/data";

export interface TowerProgressionSnapshot {
  readonly seed: string;
  readonly currentFloor: number;
  readonly highestClearedFloor: number;
  readonly checkpointFloor: number;
  readonly endlessUnlocked: boolean;
}

export interface TowerFloorClearResult {
  readonly clearedFloor: number;
  readonly nextFloor: number;
  readonly checkpointAdvanced: boolean;
  readonly endlessUnlockedNow: boolean;
}

function assertPositiveSafeInteger(value: number, label: string): void {
  if (!Number.isSafeInteger(value) || value <= 0) {
    throw new Error(`${label} must be a positive safe integer`);
  }
}

function resolveCheckpointFloor(highestClearedFloor: number): number {
  if (highestClearedFloor <= 0) return 1;
  const completedBlocks = Math.floor(highestClearedFloor / TOWER_BLOCK_SIZE);
  return completedBlocks * TOWER_BLOCK_SIZE + 1;
}

/**
 * Authoritative Tower progression state machine.
 *
 * Gameplay owns floor progression/checkpoint invariants. Persistence and UI
 * must consume snapshots from this service instead of reproducing the rules.
 */
export class TowerProgressionService {
  private seed: string;
  private currentFloor = 1;
  private highestClearedFloor = 0;
  private checkpointFloor = 1;
  private endlessUnlocked = false;

  public constructor(seed: string) {
    if (seed.length === 0) throw new Error("Tower seed must not be empty");
    this.seed = seed;
  }

  public getSnapshot(): TowerProgressionSnapshot {
    return {
      seed: this.seed,
      currentFloor: this.currentFloor,
      highestClearedFloor: this.highestClearedFloor,
      checkpointFloor: this.checkpointFloor,
      endlessUnlocked: this.endlessUnlocked,
    };
  }

  public clearCurrentFloor(floor: number): TowerFloorClearResult {
    assertPositiveSafeInteger(floor, "Tower cleared floor");
    if (floor !== this.currentFloor) {
      throw new Error(
        `Tower clear must match current floor: expected ${String(this.currentFloor)}, received ${String(floor)}`,
      );
    }

    const previousEndlessUnlocked = this.endlessUnlocked;
    this.highestClearedFloor = Math.max(this.highestClearedFloor, floor);
    this.currentFloor = floor + 1;

    const checkpointAdvanced = floor % TOWER_BLOCK_SIZE === 0;
    if (checkpointAdvanced) this.checkpointFloor = this.currentFloor;

    if (this.highestClearedFloor >= TOWER_TRIAL_FLOOR_COUNT) {
      this.endlessUnlocked = true;
    }

    return {
      clearedFloor: floor,
      nextFloor: this.currentFloor,
      checkpointAdvanced,
      endlessUnlockedNow: !previousEndlessUnlocked && this.endlessUnlocked,
    };
  }

  public failCurrentFloor(): number {
    this.currentFloor = this.checkpointFloor;
    return this.currentFloor;
  }

  public restore(snapshot: TowerProgressionSnapshot): void {
    if (snapshot.seed.length === 0) throw new Error("Tower seed must not be empty");
    assertPositiveSafeInteger(snapshot.currentFloor, "Tower current floor");
    assertPositiveSafeInteger(snapshot.checkpointFloor, "Tower checkpoint floor");
    if (!Number.isSafeInteger(snapshot.highestClearedFloor) || snapshot.highestClearedFloor < 0) {
      throw new Error("Tower highest cleared floor must be a non-negative safe integer");
    }

    const expectedCheckpointFloor = resolveCheckpointFloor(snapshot.highestClearedFloor);
    const expectedCurrentCeiling = snapshot.highestClearedFloor + 1;
    const expectedEndlessUnlocked = snapshot.highestClearedFloor >= TOWER_TRIAL_FLOOR_COUNT;

    if (snapshot.checkpointFloor !== expectedCheckpointFloor) {
      throw new Error(
        `Tower checkpoint is inconsistent with highest cleared floor: expected ${String(expectedCheckpointFloor)}`,
      );
    }
    if (snapshot.currentFloor < snapshot.checkpointFloor || snapshot.currentFloor > expectedCurrentCeiling) {
      throw new Error("Tower current floor is outside the persisted checkpoint/progression range");
    }
    if (snapshot.endlessUnlocked !== expectedEndlessUnlocked) {
      throw new Error("Tower Endless unlock state is inconsistent with highest cleared floor");
    }

    this.seed = snapshot.seed;
    this.currentFloor = snapshot.currentFloor;
    this.highestClearedFloor = snapshot.highestClearedFloor;
    this.checkpointFloor = snapshot.checkpointFloor;
    this.endlessUnlocked = snapshot.endlessUnlocked;
  }

  public reset(seed: string = this.seed): void {
    if (seed.length === 0) throw new Error("Tower seed must not be empty");
    this.seed = seed;
    this.currentFloor = 1;
    this.highestClearedFloor = 0;
    this.checkpointFloor = 1;
    this.endlessUnlocked = false;
  }
}

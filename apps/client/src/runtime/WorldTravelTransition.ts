export const WORLD_TRAVEL_TIMING = {
  exitWalkMs: 1300,
  fadeToBlackMs: 120,
  blackHoldMs: 260,
  fadeFromBlackMs: 120,
  enterWalkMs: 1300,
} as const;

export const WORLD_TRAVEL_TOTAL_MS = Object.values(WORLD_TRAVEL_TIMING)
  .reduce((total, duration) => total + duration, 0);

/**
 * Runtime-side gate for cross-zone travel.
 *
 * WorldRuntime starts the gate exactly when the authoritative active zone changes.
 * CombatRuntime consumes it using simulation delta time so no encounter can start
 * while the presentation is playing the exit/blackout/entry sequence.
 */
export class WorldTravelTransitionController {
  private remainingMs = 0;
  private generation = 0;

  public start(): void {
    this.remainingMs = WORLD_TRAVEL_TOTAL_MS;
    this.generation += 1;
  }

  public isActive(): boolean {
    return this.remainingMs > 0;
  }

  public advance(deltaMs: number): boolean {
    if (!this.isActive()) return false;
    this.remainingMs = Math.max(0, this.remainingMs - Math.max(0, deltaMs));
    return this.isActive();
  }

  public getGeneration(): number {
    return this.generation;
  }

  public reset(): void {
    this.remainingMs = 0;
  }
}

export const worldTravelTransition = new WorldTravelTransitionController();

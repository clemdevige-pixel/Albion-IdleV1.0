export const WORLD_TRAVEL_TIMING = {
  exitWalkMs: 1300,
  fadeToBlackMs: 120,
  blackHoldMs: 260,
  fadeFromBlackMs: 120,
  enterWalkMs: 1300,
} as const;

export type WorldTravelPresentationMode = "walk" | "blackout";

export const WORLD_TRAVEL_TOTAL_MS = Object.values(WORLD_TRAVEL_TIMING)
  .reduce((total, duration) => total + duration, 0);

export const WORLD_TRAVEL_BLACKOUT_TOTAL_MS = WORLD_TRAVEL_TIMING.fadeToBlackMs
  + WORLD_TRAVEL_TIMING.blackHoldMs
  + WORLD_TRAVEL_TIMING.fadeFromBlackMs;

/** Runtime-side gate for authored navigation transitions. */
export class WorldTravelTransitionController {
  private remainingMs = 0;
  private generation = 0;
  private mode: WorldTravelPresentationMode = "walk";

  public start(mode: WorldTravelPresentationMode = "walk"): void {
    this.mode = mode;
    this.remainingMs = mode === "blackout"
      ? WORLD_TRAVEL_BLACKOUT_TOTAL_MS
      : WORLD_TRAVEL_TOTAL_MS;
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

  public getMode(): WorldTravelPresentationMode {
    return this.mode;
  }

  public reset(): void {
    this.remainingMs = 0;
    this.mode = "walk";
  }
}

export const worldTravelTransition = new WorldTravelTransitionController();

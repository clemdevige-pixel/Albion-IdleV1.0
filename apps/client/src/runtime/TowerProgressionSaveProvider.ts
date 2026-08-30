import type { TowerProgressionService, TowerProgressionSnapshot } from "@game/gameplay";
import type { SaveProvider } from "@game/persistence";

function isTowerProgressionSnapshot(value: unknown): value is TowerProgressionSnapshot {
  if (value === null || typeof value !== "object" || Array.isArray(value)) return false;
  const candidate = value as Partial<TowerProgressionSnapshot>;
  return typeof candidate.seed === "string"
    && candidate.seed.length > 0
    && typeof candidate.currentFloor === "number"
    && Number.isSafeInteger(candidate.currentFloor)
    && candidate.currentFloor > 0
    && typeof candidate.highestClearedFloor === "number"
    && Number.isSafeInteger(candidate.highestClearedFloor)
    && candidate.highestClearedFloor >= 0
    && typeof candidate.checkpointFloor === "number"
    && Number.isSafeInteger(candidate.checkpointFloor)
    && candidate.checkpointFloor > 0
    && typeof candidate.endlessUnlocked === "boolean";
}

export class TowerProgressionSaveProvider implements SaveProvider {
  readonly providerId = "tower_progression";

  public constructor(
    private readonly progression: TowerProgressionService,
    private readonly fallbackSeed: string,
  ) {
    if (fallbackSeed.length === 0) throw new Error("Tower fallback seed must not be empty");
  }

  save(): unknown {
    return this.progression.getSnapshot();
  }

  load(data: unknown): void {
    if (!isTowerProgressionSnapshot(data)) {
      this.progression.reset(this.fallbackSeed);
      return;
    }

    try {
      this.progression.restore(data);
    } catch {
      this.progression.reset(this.fallbackSeed);
    }
  }
}

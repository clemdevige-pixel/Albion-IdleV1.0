import type { SaveProvider } from "@game/persistence";
import type { ZoneDefinitionId } from "../zones/zone-types.js";
import type { WorldCoordinator } from "./world-coordinator.js";
import type { WorldSaveState } from "./world-integration-types.js";

export interface SavedZoneMemory {
  readonly zoneDefId: ZoneDefinitionId;
  readonly currentSegment: number;
  /** Optional for backward compatibility with saves authored before encounter persistence. */
  readonly currentEncounter?: number;
  readonly highestUnlockedSegment: number;
  readonly completedSegments: readonly number[];
}

export interface WorldLocationSaveState {
  readonly activeZoneDefId: ZoneDefinitionId;
  readonly activeSegment: number;
  /** Optional for backward compatibility with saves authored before encounter persistence. */
  readonly activeEncounter?: number;
  readonly farmMode: boolean;
  readonly zoneMemories: readonly SavedZoneMemory[];
  /** Exploration remains blocked after defeat until the player explicitly resumes. */
  readonly awaitingResumeAfterDefeat?: boolean;
}

export interface WorldSavePayload {
  readonly world: WorldSaveState;
  readonly location?: WorldLocationSaveState | undefined;
}

export class WorldSaveProvider implements SaveProvider {
  readonly providerId = "world";

  constructor(
    private readonly coordinator: WorldCoordinator,
    private readonly getLocationState?: () => WorldLocationSaveState | undefined,
    private readonly setLocationState?: (location: WorldLocationSaveState | undefined) => void,
  ) {}

  save(): unknown {
    const world = this.coordinator.getWorldState();
    const location = this.getLocationState?.();
    const payload: WorldSavePayload = {
      world,
      ...(location !== undefined ? { location } : {}),
    };
    return payload;
  }

  load(data: unknown): void {
    if (data === null || typeof data !== "object" || !("world" in data)) {
      throw new Error("Invalid world save data: missing world property");
    }
    const payload = data as WorldSavePayload;
    this.coordinator.loadWorldState(payload.world);
    this.setLocationState?.(payload.location);
  }
}

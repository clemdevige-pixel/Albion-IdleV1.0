import type {
  SavedZoneMemory,
  WorldLocationSaveState,
  WorldProgressionManager,
  ZoneDefinitionId,
  ZoneManager,
} from "@game/gameplay";
import type { WorldCoordinator } from "@game/gameplay";
import { SEGMENTS_PER_ZONE, ENCOUNTERS_PER_SEGMENT } from "@game/data";
import { WORLD_ZONE_ORDER } from "../data/worldContentCatalog.js";

const FOREST_ZONE_DEF_ID = WORLD_ZONE_ORDER[0]!;
const ZONE_ORDER: readonly ZoneDefinitionId[] = WORLD_ZONE_ORDER;

function isSavedZoneMemory(value: unknown): value is SavedZoneMemory {
  if (value === null || typeof value !== "object") return false;
  const candidate = value as Record<string, unknown>;
  return typeof candidate.zoneDefId === "string"
    && typeof candidate.currentSegment === "number"
    && typeof candidate.highestUnlockedSegment === "number"
    && Array.isArray(candidate.completedSegments);
}

function clampEncounter(value: unknown): number {
  if (typeof value !== "number" || !Number.isFinite(value)) return 0;
  return Math.max(0, Math.min(ENCOUNTERS_PER_SEGMENT - 1, Math.floor(value)));
}

export interface WorldRuntimeDependencies {
  readonly zoneManager: ZoneManager;
  readonly progressionManager: WorldProgressionManager;
  readonly worldCoordinator: WorldCoordinator;
}

export class WorldRuntime {
  private readonly zoneManager: ZoneManager;
  private readonly progressionManager: WorldProgressionManager;
  private readonly worldCoordinator: WorldCoordinator;

  private readonly worldTick = {
    currentZoneIndex: 0,
    currentSegment: 0,
    currentEncounter: 0,
    highestUnlockedSegment: 0,
    completedSegments: new Set<number>(),
    pendingSegment: null as number | null,
    farmMode: false,
    pendingZone: null as number | null,
    pendingZoneSegment: null as number | null,
  };

  private readonly zoneMemories = ZONE_ORDER.map(() => ({
    currentSegment: 0,
    currentEncounter: 0,
    highestUnlockedSegment: 0,
    completedSegments: new Set<number>(),
  }));

  public constructor(deps: WorldRuntimeDependencies) {
    this.zoneManager = deps.zoneManager;
    this.progressionManager = deps.progressionManager;
    this.worldCoordinator = deps.worldCoordinator;
  }

  public get currentZoneIndex(): number { return this.worldTick.currentZoneIndex; }
  public get currentSegment(): number { return this.worldTick.currentSegment; }
  public get currentEncounter(): number { return this.worldTick.currentEncounter; }
  public get highestUnlockedSegment(): number { return this.worldTick.highestUnlockedSegment; }
  public get farmMode(): boolean { return this.worldTick.farmMode; }
  public get pendingSegment(): number | null { return this.worldTick.pendingSegment; }
  public get pendingZone(): number | null { return this.worldTick.pendingZone; }
  public get pendingZoneSegment(): number | null { return this.worldTick.pendingZoneSegment; }
  public get completedSegments(): ReadonlySet<number> { return this.worldTick.completedSegments; }

  public saveCurrentZoneProgress(): void {
    const memory = this.zoneMemories[this.worldTick.currentZoneIndex]!;
    memory.currentSegment = this.worldTick.currentSegment;
    memory.currentEncounter = this.worldTick.currentEncounter;
    memory.highestUnlockedSegment = this.worldTick.highestUnlockedSegment;
    memory.completedSegments = new Set(this.worldTick.completedSegments);
  }

  public changeActiveZone(nextIndex: number, targetSegment?: number, tickCounter: number = 0): void {
    this.saveCurrentZoneProgress();
    this.worldTick.currentZoneIndex = nextIndex;
    const memory = this.zoneMemories[nextIndex]!;
    this.worldTick.currentSegment = memory.currentSegment;
    this.worldTick.currentEncounter = memory.currentEncounter;
    this.worldTick.highestUnlockedSegment = memory.highestUnlockedSegment;
    this.worldTick.completedSegments = new Set(memory.completedSegments);
    if (targetSegment !== undefined) {
      this.worldTick.currentSegment = targetSegment;
      this.worldTick.currentEncounter = 0;
    }
    this.worldTick.pendingSegment = null;
    this.worldTick.pendingZone = null;
    this.worldTick.pendingZoneSegment = null;
    const nextDefId = ZONE_ORDER[nextIndex]!;
    this.worldCoordinator.changeZone(nextDefId, tickCounter);
  }

  public getActiveZoneDef(): { defId: ZoneDefinitionId; tier: number; name: string } {
    const defId = ZONE_ORDER[this.worldTick.currentZoneIndex] ?? FOREST_ZONE_DEF_ID;
    const def = this.zoneManager.registry.get(defId);
    return { defId, tier: def?.tier ?? 3, name: def?.name ?? "Unknown" };
  }

  /** Immediate internal repositioning used by lifecycle boundaries such as gathering. */
  public selectSegment(segmentNumber: number): boolean {
    const segment = segmentNumber - 1;
    if (segment < 0 || segment >= SEGMENTS_PER_ZONE || segment > this.worldTick.highestUnlockedSegment) return false;
    this.worldTick.currentSegment = segment;
    this.worldTick.currentEncounter = 0;
    this.worldTick.pendingSegment = null;
    this.worldTick.pendingZone = null;
    this.worldTick.pendingZoneSegment = null;
    return true;
  }

  /** Player-directed segment travel is applied only after the current segment completes. */
  public queueSegmentChange(segmentNumber: number): boolean {
    const segment = segmentNumber - 1;
    if (segment < 0 || segment >= SEGMENTS_PER_ZONE || segment > this.worldTick.highestUnlockedSegment) return false;
    this.worldTick.pendingSegment = segment;
    this.worldTick.pendingZone = null;
    this.worldTick.pendingZoneSegment = null;
    return true;
  }

  public setSegmentFarmMode(enabled: boolean): void { this.worldTick.farmMode = enabled; }

  /**
   * Queues all player-directed world travel. Same-zone and cross-zone clicks
   * follow the same lifecycle rule: apply after the current segment completes,
   * or immediately after defeat because that ends the current segment attempt.
   */
  public selectZone(zoneNumber: number, segmentNumber?: number): boolean {
    const nextIndex = zoneNumber - 1;
    const nextDefId = ZONE_ORDER[nextIndex];
    const targetSegment = (segmentNumber ?? 1) - 1;
    const memory = this.zoneMemories[nextIndex];
    const highestUnlockedSegment = nextIndex === this.worldTick.currentZoneIndex
      ? this.worldTick.highestUnlockedSegment
      : memory?.highestUnlockedSegment ?? -1;
    if (nextDefId === undefined || !this.progressionManager.isUnlocked(nextDefId) || targetSegment < 0 || targetSegment >= SEGMENTS_PER_ZONE || targetSegment > highestUnlockedSegment) return false;

    if (nextIndex === this.worldTick.currentZoneIndex) {
      return this.queueSegmentChange(targetSegment + 1);
    }

    this.worldTick.pendingSegment = null;
    this.worldTick.pendingZone = nextIndex;
    this.worldTick.pendingZoneSegment = targetSegment;
    return true;
  }

  public advanceVictory(): { enteredNewSegment: boolean } {
    let enteredNewSegment = false;
    this.worldTick.currentEncounter += 1;

    if (this.worldTick.currentEncounter >= ENCOUNTERS_PER_SEGMENT) {
      this.worldTick.currentEncounter = 0;
      this.worldTick.completedSegments.add(this.worldTick.currentSegment);
      enteredNewSegment = true;

      if (this.worldTick.currentSegment < SEGMENTS_PER_ZONE - 1 && this.worldTick.currentSegment === this.worldTick.highestUnlockedSegment) {
        this.worldTick.highestUnlockedSegment += 1;
      } else if (this.worldTick.currentSegment === SEGMENTS_PER_ZONE - 1) {
        const currentDefId = ZONE_ORDER[this.worldTick.currentZoneIndex] ?? FOREST_ZONE_DEF_ID;
        this.progressionManager.markCompleted(currentDefId);
      }

      if (this.worldTick.pendingZone !== null) {
        this.changeActiveZone(this.worldTick.pendingZone, this.worldTick.pendingZoneSegment ?? 0);
      } else if (this.worldTick.pendingSegment !== null) {
        this.worldTick.currentSegment = this.worldTick.pendingSegment;
        this.worldTick.pendingSegment = null;
      } else if (!this.worldTick.farmMode) {
        if (this.worldTick.currentSegment < SEGMENTS_PER_ZONE - 1) {
          this.worldTick.currentSegment += 1;
        } else {
          const nextIndex = this.worldTick.currentZoneIndex + 1;
          const nextDefId = ZONE_ORDER[nextIndex];
          if (nextDefId !== undefined && this.progressionManager.isUnlocked(nextDefId)) {
            this.changeActiveZone(nextIndex);
            this.worldTick.farmMode = false;
          }
        }
      }
    }

    return { enteredNewSegment };
  }

  public advanceDefeat(): void {
    this.worldTick.currentEncounter = 0;
    if (this.worldTick.pendingZone !== null) {
      this.changeActiveZone(this.worldTick.pendingZone, this.worldTick.pendingZoneSegment ?? 0);
    } else if (this.worldTick.pendingSegment !== null) {
      // Defeat ends the current segment attempt. Honor the player's queued
      // destination immediately so the next resume starts at that segment.
      this.worldTick.currentSegment = this.worldTick.pendingSegment;
      this.worldTick.pendingSegment = null;
    }
  }

  public getWorldLocationSaveState(): WorldLocationSaveState {
    this.saveCurrentZoneProgress();
    const memories: SavedZoneMemory[] = ZONE_ORDER.map((zoneDefId, index) => {
      const memory = this.zoneMemories[index]!;
      const isActive = index === this.worldTick.currentZoneIndex;
      const currentSeg = isActive ? this.worldTick.currentSegment : memory.currentSegment;
      const currentEncounter = isActive ? this.worldTick.currentEncounter : memory.currentEncounter;
      const highestSeg = isActive ? this.worldTick.highestUnlockedSegment : memory.highestUnlockedSegment;
      const completedSegs = isActive ? [...this.worldTick.completedSegments] : [...memory.completedSegments];
      return {
        zoneDefId,
        currentSegment: currentSeg,
        currentEncounter,
        highestUnlockedSegment: highestSeg,
        completedSegments: completedSegs.sort((a, b) => a - b),
      };
    });

    const activeZoneDefId = ZONE_ORDER[this.worldTick.currentZoneIndex] ?? FOREST_ZONE_DEF_ID;
    return {
      activeZoneDefId,
      activeSegment: this.worldTick.currentSegment,
      activeEncounter: this.worldTick.currentEncounter,
      farmMode: this.worldTick.farmMode,
      zoneMemories: memories,
    };
  }

  public setWorldLocationSaveState(savedLocation: WorldLocationSaveState | undefined): void {
    if (savedLocation !== undefined) {
      const rawZoneMemories: unknown = savedLocation.zoneMemories;
      if (Array.isArray(rawZoneMemories)) {
        const memoryByZoneDefId = new Map<ZoneDefinitionId, SavedZoneMemory>();
        for (const memory of rawZoneMemories) if (isSavedZoneMemory(memory)) memoryByZoneDefId.set(memory.zoneDefId, memory);

        for (let i = 0; i < ZONE_ORDER.length; i += 1) {
          const zoneDefId = ZONE_ORDER[i]!;
          const savedMem = memoryByZoneDefId.get(zoneDefId);
          if (savedMem !== undefined) {
            const highestUnlockedSegment = Math.max(0, Math.min(SEGMENTS_PER_ZONE - 1, Math.floor(savedMem.highestUnlockedSegment ?? 0)));
            const rawCompletedSegments: unknown = savedMem.completedSegments;
            const validCompletedSegments = Array.isArray(rawCompletedSegments)
              ? [...new Set(rawCompletedSegments.filter((segment): segment is number => typeof segment === "number"))]
                .filter((segment) => Number.isInteger(segment) && segment >= 0 && segment < SEGMENTS_PER_ZONE && segment <= highestUnlockedSegment)
                .sort((a, b) => a - b)
              : [];
            const currentSegment = Math.max(0, Math.min(highestUnlockedSegment, Math.floor(savedMem.currentSegment ?? 0)));
            this.zoneMemories[i] = {
              currentSegment,
              currentEncounter: clampEncounter(savedMem.currentEncounter),
              highestUnlockedSegment,
              completedSegments: new Set(validCompletedSegments),
            };
          }
        }

        const targetZoneDefId = savedLocation.activeZoneDefId;
        const targetIndex = ZONE_ORDER.indexOf(targetZoneDefId);
        const resolvedIndex = (targetIndex >= 0 && this.progressionManager.isUnlocked(targetZoneDefId)) ? targetIndex : 0;
        this.worldTick.currentZoneIndex = resolvedIndex;
        const memory = this.zoneMemories[resolvedIndex]!;
        const highestUnlocked = memory.highestUnlockedSegment;
        const resolvedSegment = Math.max(0, Math.min(highestUnlocked, Math.floor(savedLocation.activeSegment ?? memory.currentSegment)));

        this.worldTick.currentSegment = resolvedSegment;
        // Loading is a combat lifecycle boundary: always restart the active segment.
        this.worldTick.currentEncounter = 0;
        memory.currentSegment = resolvedSegment;
        memory.currentEncounter = 0;
        this.worldTick.highestUnlockedSegment = memory.highestUnlockedSegment;
        this.worldTick.completedSegments = new Set(memory.completedSegments);
        this.worldTick.farmMode = Boolean(savedLocation.farmMode);
      } else {
        const targetZoneDefId = savedLocation.activeZoneDefId;
        const targetIndex = ZONE_ORDER.indexOf(targetZoneDefId);
        const resolvedIndex = (targetIndex >= 0 && this.progressionManager.isUnlocked(targetZoneDefId)) ? targetIndex : 0;
        const memory = this.zoneMemories[resolvedIndex]!;
        const rawSegment = Math.floor(savedLocation.activeSegment ?? 0);
        const resolvedSegment = Math.max(0, Math.min(SEGMENTS_PER_ZONE - 1, rawSegment));
        memory.currentSegment = resolvedSegment;
        memory.currentEncounter = 0;
        memory.highestUnlockedSegment = Math.max(memory.highestUnlockedSegment, resolvedSegment);

        this.worldTick.currentZoneIndex = resolvedIndex;
        this.worldTick.currentSegment = resolvedSegment;
        this.worldTick.currentEncounter = 0;
        this.worldTick.highestUnlockedSegment = memory.highestUnlockedSegment;
        this.worldTick.completedSegments = new Set(memory.completedSegments);
        this.worldTick.farmMode = Boolean(savedLocation.farmMode);
      }
    } else {
      this.worldTick.currentZoneIndex = 0;
      this.worldTick.currentSegment = 0;
      this.worldTick.currentEncounter = 0;
      this.worldTick.highestUnlockedSegment = 0;
      this.worldTick.completedSegments.clear();
      this.worldTick.farmMode = false;
    }

    this.worldTick.pendingSegment = null;
    this.worldTick.pendingZone = null;
    this.worldTick.pendingZoneSegment = null;

    const activeZoneDefId = ZONE_ORDER[this.worldTick.currentZoneIndex] ?? FOREST_ZONE_DEF_ID;
    this.zoneManager.changeZone(activeZoneDefId);
  }
}

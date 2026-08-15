import type { WorldLocationSaveState } from "@game/gameplay";
import type { GameBridge } from "../game/GameBridge.js";

interface WorldNavigationRuntime {
  readonly currentZoneIndex: number;
  readonly farmMode: boolean;
  readonly currentSegment: number;
  readonly highestUnlockedSegment: number;
  selectSegment(segmentNumber: number): boolean;
  queueSegmentChange(segmentNumber: number): boolean;
  setSegmentFarmMode(enabled: boolean): void;
  selectZone(zoneNumber: number, segmentNumber?: number): boolean;
  getWorldLocationSaveState(): WorldLocationSaveState;
  setWorldLocationSaveState(savedLocation: WorldLocationSaveState | undefined): void;
}

interface CombatNavigationRuntime {
  interruptEncounter(): void;
  restoreHeroHealth(): void;
  resumeExploration(): boolean;
}

interface WorldNavigationActionsDependencies {
  readonly worldRuntime: WorldNavigationRuntime;
  readonly combatRuntime: CombatNavigationRuntime;
  readonly bridge: GameBridge;
  readonly updateWorldBridge: () => void;
}

/**
 * Application-level world navigation actions.
 *
 * WorldRuntime and CombatRuntime remain authoritative. This class only
 * coordinates their existing operations and updates the presentation bridge.
 */
export class WorldNavigationActions {
  private readonly deps: WorldNavigationActionsDependencies;

  public constructor(deps: WorldNavigationActionsDependencies) {
    this.deps = deps;
  }

  public prepareCombatResumeAfterGathering(): void {
    const { worldRuntime } = this.deps;
    const resumeSegment = worldRuntime.currentSegment;

    this.interruptEncounterForTravel();
    // Gathering is an explicit combat lifecycle boundary: resume from encounter 1
    // of the exact segment the player left, regardless of farm mode/progression.
    worldRuntime.selectSegment(resumeSegment + 1);
    this.deps.combatRuntime.restoreHeroHealth();
    this.deps.updateWorldBridge();
  }

  public selectSegment(segmentNumber: number): boolean {
    return this.queueManualSegmentChange(segmentNumber);
  }

  public setSegmentFarmMode(enabled: boolean): void {
    this.deps.worldRuntime.setSegmentFarmMode(enabled);
    this.deps.updateWorldBridge();
  }

  public selectZone(zoneNumber: number, segmentNumber?: number): boolean {
    const activeZoneNumber = this.deps.worldRuntime.currentZoneIndex + 1;
    if (zoneNumber === activeZoneNumber) {
      return this.queueManualSegmentChange(segmentNumber ?? 1);
    }

    if (!this.deps.worldRuntime.selectZone(zoneNumber, segmentNumber)) return false;

    this.interruptEncounterForTravel();
    this.deps.combatRuntime.restoreHeroHealth();
    this.deps.updateWorldBridge();
    return true;
  }

  public resumeExploration(): boolean {
    const resumed = this.deps.combatRuntime.resumeExploration();
    if (resumed) this.deps.bridge.setCombatState("walking");
    return resumed;
  }

  public getWorldLocationSaveState(): WorldLocationSaveState {
    return this.deps.worldRuntime.getWorldLocationSaveState();
  }

  public setWorldLocationSaveState(
    savedLocation: WorldLocationSaveState | undefined,
  ): void {
    this.interruptEncounterForTravel();
    this.deps.worldRuntime.setWorldLocationSaveState(savedLocation);
    this.deps.combatRuntime.restoreHeroHealth();
    this.deps.updateWorldBridge();
    this.deps.bridge.setCombatState("walking");
  }

  private queueManualSegmentChange(segmentNumber: number): boolean {
    if (!this.deps.worldRuntime.queueSegmentChange(segmentNumber)) return false;

    // Manual segment travel is deferred until the current segment completes.
    // Keep the active encounter running and only expose the pending destination.
    this.deps.updateWorldBridge();
    return true;
  }

  private interruptEncounterForTravel(): void {
    this.deps.combatRuntime.interruptEncounter();
    // Travel is an authoritative encounter boundary. Clear the bridge in the
    // same transaction as the runtime interruption so presentation can never
    // render the previous enemy for a frame while the world location changes.
    this.deps.bridge.clearEnemyPresentation();
    this.deps.bridge.setCombatState("walking");
  }
}

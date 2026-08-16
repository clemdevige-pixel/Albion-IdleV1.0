import type { WorldLocationSaveState } from "@game/gameplay";
import type { GameBridge } from "../game/GameBridge.js";
import { combatStopController } from "../runtime/CombatStopController.js";

interface WorldNavigationRuntime {
  readonly currentZoneIndex: number;
  readonly farmMode: boolean;
  readonly currentSegment: number;
  readonly highestUnlockedSegment: number;
  selectSegment(segmentNumber: number): boolean;
  queueSegmentChange(segmentNumber: number): boolean;
  setSegmentFarmMode(enabled: boolean): void;
  selectZone(zoneNumber: number, segmentNumber?: number): boolean;
  changeActiveZone(nextIndex: number, targetSegment?: number, tickCounter?: number): void;
  getWorldLocationSaveState(): WorldLocationSaveState;
  setWorldLocationSaveState(savedLocation: WorldLocationSaveState | undefined): void;
}

interface CombatNavigationRuntime {
  interruptEncounter(): void;
  restoreHeroHealth(): void;
  resumeExploration(): boolean;
  isAwaitingResumeAfterDefeat(): boolean;
  restoreAwaitingResumeAfterDefeat(): void;
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
    const resumeSegment = worldRuntime.farmMode
      ? worldRuntime.currentSegment
      : worldRuntime.highestUnlockedSegment;

    this.interruptEncounterForTravel();
    // Gathering is an explicit combat lifecycle boundary. Progression resumes
    // from the furthest unlocked segment; Farm resumes the selected segment.
    worldRuntime.selectSegment(resumeSegment + 1);
    this.deps.combatRuntime.restoreHeroHealth();
    this.deps.updateWorldBridge();
  }

  public selectSegment(segmentNumber: number): boolean {
    if (this.canTravelImmediately()) {
      if (!this.deps.worldRuntime.selectSegment(segmentNumber)) return false;
      if (this.deps.bridge.combatState === "defeat") {
        this.deps.bridge.clearEnemyPresentation();
      }
      this.deps.updateWorldBridge();
      return true;
    }
    return this.queueManualSegmentChange(segmentNumber);
  }

  public setSegmentFarmMode(enabled: boolean): void {
    this.deps.worldRuntime.setSegmentFarmMode(enabled);
    this.deps.updateWorldBridge();
  }

  public selectZone(zoneNumber: number, segmentNumber?: number): boolean {
    const targetSegment = segmentNumber ?? 1;
    const currentZoneNumber = this.deps.worldRuntime.currentZoneIndex + 1;
    const wasDefeated = this.deps.bridge.combatState === "defeat";

    // WorldRuntime remains the single validation authority for zone unlocks and
    // segment bounds. During active combat it also owns the queued destination.
    if (!this.deps.worldRuntime.selectZone(zoneNumber, targetSegment)) return false;

    if (this.canTravelImmediately()) {
      if (zoneNumber === currentZoneNumber) {
        // selectZone queued the validated same-zone destination; apply it now
        // because no encounter is active to wait for.
        this.deps.worldRuntime.selectSegment(targetSegment);
      } else {
        // Cross-zone travel uses the already validated destination. changeActiveZone
        // consumes/clears the queued fields while preserving the inactive combat state.
        this.deps.worldRuntime.changeActiveZone(zoneNumber - 1, targetSegment - 1);
      }
      if (wasDefeated) this.deps.bridge.clearEnemyPresentation();
    }

    this.deps.updateWorldBridge();
    return true;
  }

  public resumeExploration(): boolean {
    const resumed = this.deps.combatRuntime.resumeExploration();
    if (resumed) {
      // The defeated ECS enemy is already gone, but its bridge presentation can
      // still be visible. Clear it before the next authoritative spawn so Phaser
      // cannot reject the replacement as a different still-living encounter.
      this.deps.bridge.clearEnemyPresentation();
      this.deps.bridge.setCombatState("walking");
    }
    return resumed;
  }

  public getWorldLocationSaveState(): WorldLocationSaveState {
    return {
      ...this.deps.worldRuntime.getWorldLocationSaveState(),
      awaitingResumeAfterDefeat: this.deps.combatRuntime.isAwaitingResumeAfterDefeat(),
    };
  }

  public setWorldLocationSaveState(
    savedLocation: WorldLocationSaveState | undefined,
  ): void {
    const restoreDefeat = savedLocation?.awaitingResumeAfterDefeat === true;

    this.interruptEncounterForTravel();
    this.deps.worldRuntime.setWorldLocationSaveState(savedLocation);

    if (restoreDefeat) {
      this.deps.combatRuntime.restoreAwaitingResumeAfterDefeat();
      this.deps.updateWorldBridge();
      this.deps.bridge.setCombatState("defeat");
      return;
    }

    this.deps.combatRuntime.restoreHeroHealth();
    this.deps.updateWorldBridge();
    this.deps.bridge.setCombatState("walking");
  }

  private canTravelImmediately(): boolean {
    return combatStopController.isPaused() || this.deps.bridge.combatState === "defeat";
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

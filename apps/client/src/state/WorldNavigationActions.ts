import type { WorldLocationSaveState } from "@game/gameplay";
import type { GameBridge } from "../game/GameBridge.js";
import type { CombatLoopState } from "../runtime/CombatRuntime.js";

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
  getLoopState(): CombatLoopState;
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
 * WorldRuntime owns location/progression and CombatRuntime owns combat lifecycle.
 * GameBridge is presentation output only and must never decide navigation rules.
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
    const loopState = this.deps.combatRuntime.getLoopState();
    if (this.canTravelImmediately(loopState)) {
      if (!this.deps.worldRuntime.selectSegment(segmentNumber)) return false;
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
    const loopState = this.deps.combatRuntime.getLoopState();

    // WorldRuntime remains the single validation authority for zone unlocks and
    // segment bounds. During active combat it also owns the queued destination.
    if (!this.deps.worldRuntime.selectZone(zoneNumber, targetSegment)) return false;

    if (this.canTravelImmediately(loopState)) {
      if (zoneNumber === currentZoneNumber) {
        // selectZone queued the validated same-zone destination; apply it now
        // because no encounter is active to wait for.
        this.deps.worldRuntime.selectSegment(targetSegment);
      } else {
        // Cross-zone travel uses the already validated destination. changeActiveZone
        // consumes/clears the queued fields while preserving the inactive combat state.
        this.deps.worldRuntime.changeActiveZone(zoneNumber - 1, targetSegment - 1);
      }
    }

    this.deps.updateWorldBridge();
    return true;
  }

  public resumeExploration(): boolean {
    const resumed = this.deps.combatRuntime.resumeExploration();
    if (resumed) this.deps.bridge.setCombatState("walking");
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

  private canTravelImmediately(loopState: CombatLoopState): boolean {
    return loopState === "paused" || loopState === "defeat";
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
    this.deps.bridge.setCombatState("walking");
  }
}

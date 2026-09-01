import type { EntityId } from "@game/core";
import { getTowerFloorDefinition, type EquipmentManager, type TowerProgressionService } from "@game/gameplay";
import type { GameBridge } from "../game/GameBridge.js";
import type { CombatLoopState } from "../runtime/CombatRuntime.js";
import type { CombatActivityRuntimeRouter } from "../runtime/CombatActivityRuntimeRouter.js";
import type { TowerCombatRuntimeRouter } from "../runtime/TowerCombatRuntimeRouter.js";
import { isDevSandboxMode } from "../runtime/devSandbox.js";
import { worldTravelTransition } from "../runtime/WorldTravelTransition.js";
import { getEquippedTierAccessFacts } from "./EquipmentTierAccess.js";

interface TowerCombatRuntime {
  getLoopState(): CombatLoopState;
  interruptEncounter(): void;
}

interface TowerStopController {
  isPaused(): boolean;
  requestStopAfterEncounter(): boolean;
  reset(): void;
}

interface TowerNavigationActionsDependencies {
  readonly progression: TowerProgressionService;
  readonly towerRouter: TowerCombatRuntimeRouter;
  readonly activityRouter: CombatActivityRuntimeRouter;
  readonly equipmentManager: EquipmentManager;
  readonly heroId: EntityId;
  readonly combatRuntime: TowerCombatRuntime;
  readonly stopController: TowerStopController;
  readonly bridge: GameBridge;
  readonly isCombatSuspended: () => boolean;
  readonly isTowerUnlocked: () => boolean;
  readonly onStateChanged: () => void;
}

export type TowerAccessReason =
  | "available"
  | "research_locked"
  | "activity_busy"
  | "weapon_required"
  | "equipment_tier_locked";

export interface TowerAccessState {
  readonly canEnter: boolean;
  readonly reason: TowerAccessReason;
  readonly requiredTier: number;
  readonly highestEquippedTier?: number;
}

export interface TowerAccessFacts {
  readonly requiredTier: number;
  readonly researchUnlocked: boolean;
  readonly activityAvailable: boolean;
  readonly hasWeapon: boolean;
  readonly highestEquippedTier?: number;
}

export function resolveTowerAccessState(facts: TowerAccessFacts): TowerAccessState {
  if (!facts.researchUnlocked) {
    return { canEnter: false, reason: "research_locked", requiredTier: facts.requiredTier };
  }
  if (!facts.activityAvailable) {
    return { canEnter: false, reason: "activity_busy", requiredTier: facts.requiredTier };
  }
  if (!facts.hasWeapon) {
    return { canEnter: false, reason: "weapon_required", requiredTier: facts.requiredTier };
  }
  if (facts.highestEquippedTier !== undefined && facts.highestEquippedTier > facts.requiredTier) {
    return {
      canEnter: false,
      reason: "equipment_tier_locked",
      requiredTier: facts.requiredTier,
      highestEquippedTier: facts.highestEquippedTier,
    };
  }
  return {
    canEnter: true,
    reason: "available",
    requiredTier: facts.requiredTier,
    ...(facts.highestEquippedTier === undefined
      ? {}
      : { highestEquippedTier: facts.highestEquippedTier }),
  };
}

export interface TowerNavigationState {
  readonly active: boolean;
  readonly intermission: boolean;
  readonly engaged: boolean;
  readonly pendingStart: boolean;
  readonly progression: ReturnType<TowerProgressionService["getSnapshot"]>;
  readonly unlockedCheckpointFloors: readonly number[];
  readonly access: TowerAccessState;
}

/** Owns Tower entry/exit, checkpoint selection and the hard authored equipment-tier gate. */
export class TowerNavigationActions {
  private pendingStart = false;
  private pendingAbandon = false;

  public constructor(private readonly deps: TowerNavigationActionsDependencies) {}

  public getState(): TowerNavigationState {
    return {
      active: this.deps.towerRouter.isTowerActive(),
      intermission: this.deps.towerRouter.isTowerIntermission(),
      engaged: this.deps.towerRouter.isTowerEngaged(),
      pendingStart: this.pendingStart,
      progression: this.deps.progression.getSnapshot(),
      unlockedCheckpointFloors: this.deps.progression.getUnlockedCheckpointFloors(),
      access: this.getAccess(),
    };
  }

  /** Clears only transient attempt/request state before a different save snapshot is loaded. */
  public resetTransientState(): void {
    this.pendingStart = false;
    this.pendingAbandon = false;
    this.deps.towerRouter.abandon();
  }

  public selectCheckpoint(floor: number): boolean {
    if (this.pendingStart || this.pendingAbandon || this.deps.towerRouter.isTowerEngaged()) return false;
    try {
      this.deps.progression.selectCheckpoint(floor);
    } catch {
      return false;
    }
    this.deps.onStateChanged();
    return true;
  }

  public requestStart(): boolean {
    if (
      this.deps.isCombatSuspended()
      || this.pendingStart
      || this.pendingAbandon
      || this.deps.towerRouter.isTowerActive()
    ) {
      return false;
    }
    const access = this.getAccess();
    if (!access.canEnter) {
      this.notifyAccessFailure(access);
      return false;
    }

    const loopState = this.deps.combatRuntime.getLoopState();
    if (loopState === "suspended") return false;
    if (loopState === "combat" || loopState === "stop_requested") {
      this.pendingStart = true;
      if (loopState === "combat" && !this.deps.stopController.requestStopAfterEncounter()) {
        this.pendingStart = false;
        return false;
      }
      this.deps.onStateChanged();
      return true;
    }
    return this.startNow();
  }

  public flushPendingStart(): boolean {
    if (!this.deps.stopController.isPaused()) return false;
    if (this.pendingAbandon) return this.abandonNow();
    if (!this.pendingStart) return false;
    return this.startNow();
  }

  public abandon(): boolean {
    if (!this.deps.towerRouter.isTowerActive()) return false;
    if (this.pendingAbandon) return true;

    const loopState = this.deps.combatRuntime.getLoopState();
    if (loopState === "combat" || loopState === "stop_requested") {
      this.pendingAbandon = true;
      if (loopState === "combat" && !this.deps.stopController.requestStopAfterEncounter()) {
        this.pendingAbandon = false;
        return false;
      }
      this.deps.onStateChanged();
      return true;
    }

    return this.abandonNow();
  }

  private abandonNow(): boolean {
    if (!this.deps.towerRouter.abandon()) {
      this.pendingAbandon = false;
      return false;
    }
    this.deps.combatRuntime.interruptEncounter();
    this.deps.stopController.reset();
    this.pendingAbandon = false;
    worldTravelTransition.start();
    this.deps.onStateChanged();
    return true;
  }

  private getAccess(): TowerAccessState {
    const snapshot = this.deps.progression.getSnapshot();
    const floor = getTowerFloorDefinition(snapshot.currentFloor, snapshot.seed);
    const equipment = getEquippedTierAccessFacts(this.deps.equipmentManager, this.deps.heroId);
    return resolveTowerAccessState({
      requiredTier: floor.block.tier,
      researchUnlocked: this.deps.isTowerUnlocked() || isDevSandboxMode(),
      activityAvailable: this.deps.activityRouter.canStartTower(),
      hasWeapon: equipment.hasWeapon,
      ...(equipment.highestEquippedTier === undefined
        ? {}
        : { highestEquippedTier: equipment.highestEquippedTier }),
    });
  }

  private startNow(): boolean {
    const access = this.getAccess();
    if (!access.canEnter) {
      this.pendingStart = false;
      this.notifyAccessFailure(access);
      this.deps.onStateChanged();
      return false;
    }

    this.deps.combatRuntime.interruptEncounter();
    const started = this.deps.towerRouter.start();
    this.pendingStart = false;
    this.deps.stopController.reset();
    if (started) worldTravelTransition.start();
    this.deps.onStateChanged();
    return started;
  }

  private notifyAccessFailure(access: TowerAccessState): void {
    let message: string | undefined;
    if (access.reason === "research_locked") {
      message = "Accès refusé : la Tour doit d'abord être découverte par l'Académie.";
    } else if (access.reason === "activity_busy") {
      message = "Accès refusé : terminez ou quittez l'activité de combat en cours.";
    } else if (access.reason === "weapon_required") {
      message = "Accès refusé : une arme doit être équipée.";
    } else if (access.reason === "equipment_tier_locked") {
      message = `Bloc T${String(access.requiredTier)} : l'équipement supérieur au T${String(access.requiredTier)} n'est pas autorisé (T${String(access.highestEquippedTier ?? access.requiredTier + 1)} détecté).`;
    }
    if (message === undefined) return;
    this.deps.bridge.addEconomyNotification({
      id: `notif_tower_access_${access.reason}_${String(Date.now())}`,
      type: "error",
      message,
      timestamp: Date.now(),
    });
  }
}

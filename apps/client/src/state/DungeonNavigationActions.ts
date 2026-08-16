import type { EntityId } from "@game/core";
import type {
  DungeonRunState,
  DungeonRuntime,
  EquipmentManager,
  InventoryManager,
} from "@game/gameplay";
import type { CombatLoopState } from "../runtime/CombatRuntime.js";

interface DungeonCombatRuntime {
  getLoopState(): CombatLoopState;
  interruptEncounter(): void;
}

interface DungeonStopController {
  isPaused(): boolean;
  requestStopAfterSegment(): boolean;
  reset(): void;
  subscribe(listener: () => void): () => void;
}

interface DungeonNavigationActionsDependencies {
  readonly dungeonRuntime: DungeonRuntime;
  readonly inventoryManager: InventoryManager;
  readonly equipmentManager: EquipmentManager;
  readonly heroId: EntityId;
  readonly combatRuntime: DungeonCombatRuntime;
  readonly stopController: DungeonStopController;
  readonly isCombatSuspended: () => boolean;
  readonly onStateChanged: () => void;
}

export interface DungeonNavigationState {
  readonly activeRun: DungeonRunState | undefined;
  readonly pendingDefinitionId: string | null;
}

/**
 * Application-level dungeon navigation.
 *
 * Entering a dungeon follows the exact same combat boundary as manual pause:
 * an active segment is allowed to finish, CombatStopController reaches paused,
 * then the world encounter is replaced by the dungeon run and combat resumes.
 */
export class DungeonNavigationActions {
  private pendingDefinitionId: string | null = null;
  private unsubscribePendingPause: (() => void) | undefined;

  public constructor(private readonly deps: DungeonNavigationActionsDependencies) {}

  public getState(): DungeonNavigationState {
    return {
      activeRun: this.deps.dungeonRuntime.activeRun,
      pendingDefinitionId: this.pendingDefinitionId,
    };
  }

  public requestStart(definitionId: string): boolean {
    if (
      this.deps.isCombatSuspended()
      || this.deps.dungeonRuntime.activeRun?.status === "active"
      || this.pendingDefinitionId !== null
      || this.deps.equipmentManager.getEquippedItem(this.deps.heroId, "weapon") === undefined
      || !this.canConsumeDungeonKey(definitionId)
    ) return false;

    const loopState = this.deps.combatRuntime.getLoopState();
    if (loopState === "suspended") return false;

    if (loopState === "combat" || loopState === "stop_requested") {
      this.pendingDefinitionId = definitionId;
      this.watchForSegmentPause();
      if (loopState === "combat" && !this.deps.stopController.requestStopAfterSegment()) {
        this.clearPendingStart();
        return false;
      }
      this.deps.onStateChanged();
      return true;
    }

    return this.startNow(definitionId);
  }

  public abandon(): boolean {
    if (this.deps.dungeonRuntime.activeRun?.status !== "active") return false;
    this.deps.dungeonRuntime.abandon();
    this.deps.combatRuntime.interruptEncounter();
    this.deps.stopController.reset();
    this.deps.onStateChanged();
    return true;
  }

  public dispose(): void {
    this.unsubscribePendingPause?.();
    this.unsubscribePendingPause = undefined;
  }

  private watchForSegmentPause(): void {
    this.unsubscribePendingPause?.();
    this.unsubscribePendingPause = this.deps.stopController.subscribe(() => {
      const definitionId = this.pendingDefinitionId;
      if (definitionId === null || !this.deps.stopController.isPaused()) return;
      this.unsubscribePendingPause?.();
      this.unsubscribePendingPause = undefined;
      this.startNow(definitionId);
    });
  }

  private startNow(definitionId: string): boolean {
    this.deps.combatRuntime.interruptEncounter();
    const started = this.deps.dungeonRuntime.start(
      definitionId,
      this.deps.heroId,
      this.deps.inventoryManager,
    );

    this.clearPendingStart();
    this.deps.stopController.reset();
    this.deps.onStateChanged();
    return started.ok;
  }

  private clearPendingStart(): void {
    this.pendingDefinitionId = null;
    this.unsubscribePendingPause?.();
    this.unsubscribePendingPause = undefined;
  }

  private canConsumeDungeonKey(definitionId: string): boolean {
    const definition = this.deps.dungeonRuntime.getDefinition(definitionId);
    if (definition === undefined) return false;
    return this.deps.inventoryManager.listSlots(this.deps.heroId).some(
      (slot) => slot.entry?.itemId === definition.keyItemId && slot.entry.quantity > 0,
    );
  }
}

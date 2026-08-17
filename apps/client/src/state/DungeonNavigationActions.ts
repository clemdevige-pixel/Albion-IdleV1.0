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
  requestStopAfterEncounter(): boolean;
  reset(): void;
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
 * Entering a dungeon follows the same combat boundary as other deferred actions:
 * the active encounter is allowed to finish, CombatStopController reaches paused,
 * then the world encounter is replaced by the dungeon run and combat resumes.
 */
export class DungeonNavigationActions {
  private pendingDefinitionId: string | null = null;

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
      if (loopState === "combat" && !this.deps.stopController.requestStopAfterEncounter()) {
        this.pendingDefinitionId = null;
        return false;
      }
      this.deps.onStateChanged();
      return true;
    }

    return this.startNow(definitionId);
  }

  /** Flush only after CombatRuntime.tick has fully reached the stable paused state. */
  public flushPendingStart(): boolean {
    const definitionId = this.pendingDefinitionId;
    if (definitionId === null || !this.deps.stopController.isPaused()) return false;
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

  private startNow(definitionId: string): boolean {
    this.deps.combatRuntime.interruptEncounter();
    const started = this.deps.dungeonRuntime.start(
      definitionId,
      this.deps.heroId,
      this.deps.inventoryManager,
    );

    this.pendingDefinitionId = null;
    // The pause belongs to the completed world encounter. The dungeon starts as
    // a fresh combat session and must not inherit the world pause state.
    this.deps.stopController.reset();
    this.deps.onStateChanged();
    return started.ok;
  }

  private canConsumeDungeonKey(definitionId: string): boolean {
    const definition = this.deps.dungeonRuntime.getDefinition(definitionId);
    if (definition === undefined) return false;
    return this.deps.inventoryManager.listSlots(this.deps.heroId).some(
      (slot) => slot.entry?.itemId === definition.keyItemId && slot.entry.quantity > 0,
    );
  }
}

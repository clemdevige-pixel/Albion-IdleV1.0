import type { EntityId } from "@game/core";
import type {
  DungeonRunState,
  DungeonRuntime,
  EquipmentManager,
  InventoryManager,
} from "@game/gameplay";
import { getItemTier } from "../data/itemPower.js";
import type { GameBridge } from "../game/GameBridge.js";
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
  readonly bridge: GameBridge;
  readonly isCombatSuspended: () => boolean;
  readonly onStateChanged: () => void;
}

export interface DungeonNavigationState {
  readonly activeRun: DungeonRunState | undefined;
  readonly pendingDefinitionId: string | null;
  readonly clearedTiers: readonly number[];
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
      clearedTiers: this.deps.dungeonRuntime.getClearedTiers(),
    };
  }

  public requestStart(definitionId: string): boolean {
    if (
      this.deps.isCombatSuspended()
      || this.deps.dungeonRuntime.activeRun?.status === "active"
      || this.pendingDefinitionId !== null
      || this.deps.equipmentManager.getEquippedItem(this.deps.heroId, "weapon") === undefined
      || !this.canAccessDungeonTier(definitionId)
      || !this.canEnterDungeonWithCurrentEquipment(definitionId)
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
    if (!this.canAccessDungeonTier(definitionId) || !this.canEnterDungeonWithCurrentEquipment(definitionId)) {
      this.pendingDefinitionId = null;
      this.deps.onStateChanged();
      return false;
    }

    this.deps.combatRuntime.interruptEncounter();
    const started = this.deps.dungeonRuntime.start(
      definitionId,
      this.deps.heroId,
      this.deps.inventoryManager,
    );

    this.pendingDefinitionId = null;
    this.deps.stopController.reset();
    this.deps.onStateChanged();
    return started.ok;
  }

  private canAccessDungeonTier(definitionId: string): boolean {
    const definition = this.deps.dungeonRuntime.getDefinition(definitionId);
    if (definition === undefined) return false;
    if (definition.tier <= 4 || this.deps.dungeonRuntime.hasClearedTier(definition.tier - 1)) return true;

    this.deps.bridge.addEconomyNotification({
      id: `notif_dungeon_progression_gate_${String(Date.now())}`,
      type: "error",
      message: `Accès refusé : validez d'abord un donjon T${String(definition.tier - 1)}.`,
      timestamp: Date.now(),
    });
    return false;
  }

  private canEnterDungeonWithCurrentEquipment(definitionId: string): boolean {
    const definition = this.deps.dungeonRuntime.getDefinition(definitionId);
    if (definition === undefined) return false;

    const violatingTiers = [...this.deps.equipmentManager.getEquipped(this.deps.heroId).values()]
      .map((entry) => getItemTier(entry.itemId))
      .filter((tier): tier is NonNullable<ReturnType<typeof getItemTier>> => (
        tier !== undefined && tier > definition.tier
      ));
    if (violatingTiers.length === 0) return true;

    const highestTier = Math.max(...violatingTiers);
    this.deps.bridge.addEconomyNotification({
      id: `notif_dungeon_tier_cap_${String(Date.now())}`,
      type: "error",
      message: `Accès refusé : ce donjon T${String(definition.tier)} n'accepte pas d'équipement supérieur au T${String(definition.tier)} (équipement T${String(highestTier)} détecté).`,
      timestamp: Date.now(),
    });
    return false;
  }

  private canConsumeDungeonKey(definitionId: string): boolean {
    const definition = this.deps.dungeonRuntime.getDefinition(definitionId);
    if (definition === undefined) return false;
    return this.deps.inventoryManager.listSlots(this.deps.heroId).some(
      (slot) => slot.entry?.itemId === definition.keyItemId && slot.entry.quantity > 0,
    );
  }
}

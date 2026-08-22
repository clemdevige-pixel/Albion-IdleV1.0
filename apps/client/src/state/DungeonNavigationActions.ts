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
import { worldTravelTransition } from "../runtime/WorldTravelTransition.js";

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
  readonly canAccessDungeonContent: (definitionId: string) => boolean;
  readonly onStateChanged: () => void;
}

export type DungeonAccessReason =
  | "available"
  | "invalid_definition"
  | "research_locked"
  | "progression_locked"
  | "equipment_tier_locked"
  | "weapon_required"
  | "missing_key";

export interface DungeonAccessState {
  readonly canEnter: boolean;
  readonly reason: DungeonAccessReason;
  readonly previousTier?: number;
  readonly highestEquippedTier?: number;
}

export interface DungeonNavigationState {
  readonly activeRun: DungeonRunState | undefined;
  readonly pendingDefinitionId: string | null;
  readonly clearedTiers: readonly number[];
  readonly getAccess: (definitionId: string) => DungeonAccessState;
}

/**
 * Application-level dungeon navigation and access authority.
 *
 * All entry requirements are resolved once here so callers and UI cannot drift:
 * authored Research access, tier progression, equipment cap, weapon requirement and key.
 */
export class DungeonNavigationActions {
  private pendingDefinitionId: string | null = null;

  public constructor(private readonly deps: DungeonNavigationActionsDependencies) {}

  public getState(): DungeonNavigationState {
    return {
      activeRun: this.deps.dungeonRuntime.activeRun,
      pendingDefinitionId: this.pendingDefinitionId,
      clearedTiers: this.deps.dungeonRuntime.getClearedTiers(),
      getAccess: (definitionId) => this.getAccess(definitionId),
    };
  }

  public requestStart(definitionId: string): boolean {
    if (
      this.deps.isCombatSuspended()
      || this.deps.dungeonRuntime.activeRun?.status === "active"
      || this.pendingDefinitionId !== null
    ) return false;

    const access = this.getAccess(definitionId);
    if (!access.canEnter) {
      this.notifyAccessFailure(definitionId, access);
      return false;
    }

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
    worldTravelTransition.start();
    this.deps.onStateChanged();
    return true;
  }

  private getAccess(definitionId: string): DungeonAccessState {
    const definition = this.deps.dungeonRuntime.getDefinition(definitionId);
    if (definition === undefined) return { canEnter: false, reason: "invalid_definition" };

    if (!this.deps.canAccessDungeonContent(definitionId)) {
      return { canEnter: false, reason: "research_locked" };
    }

    if (!this.deps.dungeonRuntime.canAccessDefinition(definitionId)) {
      return {
        canEnter: false,
        reason: "progression_locked",
        previousTier: definition.tier - 1,
      };
    }

    if (this.deps.equipmentManager.getEquippedItem(this.deps.heroId, "weapon") === undefined) {
      return { canEnter: false, reason: "weapon_required" };
    }

    const violatingTiers = [...this.deps.equipmentManager.getEquipped(this.deps.heroId).values()]
      .map((entry) => getItemTier(entry.itemId))
      .filter((tier): tier is NonNullable<ReturnType<typeof getItemTier>> => (
        tier !== undefined && tier > definition.tier
      ));
    if (violatingTiers.length > 0) {
      return {
        canEnter: false,
        reason: "equipment_tier_locked",
        highestEquippedTier: Math.max(...violatingTiers),
      };
    }

    const hasKey = this.deps.inventoryManager.listSlots(this.deps.heroId).some(
      (slot) => slot.entry?.itemId === definition.keyItemId && slot.entry.quantity > 0,
    );
    if (!hasKey) return { canEnter: false, reason: "missing_key" };

    return { canEnter: true, reason: "available" };
  }

  private startNow(definitionId: string): boolean {
    const access = this.getAccess(definitionId);
    if (!access.canEnter) {
      this.pendingDefinitionId = null;
      this.notifyAccessFailure(definitionId, access);
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
    if (started.ok) worldTravelTransition.start();
    this.deps.onStateChanged();
    return started.ok;
  }

  private notifyAccessFailure(definitionId: string, access: DungeonAccessState): void {
    const definition = this.deps.dungeonRuntime.getDefinition(definitionId);
    if (definition === undefined) return;

    let message: string | undefined;
    if (access.reason === "research_locked") {
      message = "Accès refusé : recherche de cette famille de donjons requise.";
    } else if (access.reason === "progression_locked") {
      message = `Accès refusé : validez d'abord un donjon T${String(access.previousTier ?? definition.tier - 1)}.`;
    } else if (access.reason === "equipment_tier_locked") {
      message = `Accès refusé : ce donjon T${String(definition.tier)} n'accepte pas d'équipement supérieur au T${String(definition.tier)} (équipement T${String(access.highestEquippedTier ?? definition.tier + 1)} détecté).`;
    }
    if (message === undefined) return;

    this.deps.bridge.addEconomyNotification({
      id: `notif_dungeon_access_${access.reason}_${String(Date.now())}`,
      type: "error",
      message,
      timestamp: Date.now(),
    });
  }
}

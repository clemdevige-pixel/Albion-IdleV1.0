import type { EntityId } from "@game/core";
import type {
  DungeonRunState,
  DungeonRuntime,
  EquipmentManager,
} from "@game/gameplay";
import type { GameBridge } from "../game/GameBridge.js";
import type { CombatLoopState } from "../runtime/CombatRuntime.js";
import { dungeonCompletionFlow } from "../runtime/DungeonCompletionFlow.js";
import type { PlayerInventoryManager } from "../runtime/PlayerInventoryManager.js";
import { worldTravelTransition } from "../runtime/WorldTravelTransition.js";
import { getEquippedTierAccessFacts } from "./EquipmentTierAccess.js";

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
  readonly inventoryManager: PlayerInventoryManager;
  readonly equipmentManager: EquipmentManager;
  readonly heroId: EntityId;
  readonly combatRuntime: DungeonCombatRuntime;
  readonly stopController: DungeonStopController;
  readonly bridge: GameBridge;
  readonly isCombatSuspended: () => boolean;
  readonly canStartDungeon: () => boolean;
  readonly canAccessDungeonContent: (definitionId: string) => boolean;
  readonly onStateChanged: () => void;
}

export type DungeonAccessReason =
  | "available"
  | "invalid_definition"
  | "activity_busy"
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

export interface DungeonAccessFacts {
  readonly definitionTier?: number;
  readonly researchUnlocked: boolean;
  readonly progressionUnlocked: boolean;
  readonly hasWeapon: boolean;
  readonly highestEquippedTier?: number;
  readonly hasKey: boolean;
  readonly activityAvailable?: boolean;
}

export function resolveDungeonAccessState(facts: DungeonAccessFacts): DungeonAccessState {
  if (facts.definitionTier === undefined) return { canEnter: false, reason: "invalid_definition" };
  if (facts.activityAvailable === false) return { canEnter: false, reason: "activity_busy" };
  if (!facts.researchUnlocked) return { canEnter: false, reason: "research_locked" };
  if (!facts.progressionUnlocked) {
    return {
      canEnter: false,
      reason: "progression_locked",
      previousTier: facts.definitionTier - 1,
    };
  }
  if (!facts.hasWeapon) return { canEnter: false, reason: "weapon_required" };
  if (
    facts.highestEquippedTier !== undefined
    && facts.highestEquippedTier > facts.definitionTier
  ) {
    return {
      canEnter: false,
      reason: "equipment_tier_locked",
      highestEquippedTier: facts.highestEquippedTier,
    };
  }
  if (!facts.hasKey) return { canEnter: false, reason: "missing_key" };
  return { canEnter: true, reason: "available" };
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
 * activity availability, authored Research access, tier progression, equipment
 * cap, weapon requirement and key.
 */
export class DungeonNavigationActions {
  private pendingDefinitionId: string | null = null;
  private pendingAbandon = false;

  public constructor(private readonly deps: DungeonNavigationActionsDependencies) {}

  public getState(): DungeonNavigationState {
    return {
      activeRun: this.deps.dungeonRuntime.activeRun,
      pendingDefinitionId: this.pendingDefinitionId,
      clearedTiers: this.deps.dungeonRuntime.getClearedTiers(),
      getAccess: (definitionId) => this.getAccess(definitionId),
    };
  }

  /** Clears only transient attempt/request state before a different save snapshot is loaded. */
  public resetTransientState(): void {
    this.pendingDefinitionId = null;
    this.pendingAbandon = false;
    if (this.deps.dungeonRuntime.activeRun?.status === "active") {
      this.deps.dungeonRuntime.abandon();
      dungeonCompletionFlow.cancel();
    }
  }

  public requestStart(definitionId: string): boolean {
    if (
      this.deps.isCombatSuspended()
      || this.deps.dungeonRuntime.activeRun?.status === "active"
      || this.pendingDefinitionId !== null
      || this.pendingAbandon
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
    if (!this.deps.stopController.isPaused()) return false;
    if (this.pendingAbandon) return this.abandonNow();
    const definitionId = this.pendingDefinitionId;
    if (definitionId === null) return false;
    return this.startNow(definitionId);
  }

  public abandon(): boolean {
    if (this.deps.dungeonRuntime.activeRun?.status !== "active") return false;
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
    if (this.deps.dungeonRuntime.activeRun?.status !== "active") {
      this.pendingAbandon = false;
      return false;
    }
    this.deps.dungeonRuntime.abandon();
    dungeonCompletionFlow.cancel();
    this.deps.combatRuntime.interruptEncounter();
    this.deps.stopController.reset();
    this.pendingAbandon = false;
    worldTravelTransition.start();
    this.deps.onStateChanged();
    return true;
  }

  private getAccess(definitionId: string): DungeonAccessState {
    const definition = this.deps.dungeonRuntime.getDefinition(definitionId);
    if (definition === undefined) {
      return resolveDungeonAccessState({
        researchUnlocked: false,
        progressionUnlocked: false,
        hasWeapon: false,
        hasKey: false,
      });
    }

    const equipment = getEquippedTierAccessFacts(this.deps.equipmentManager, this.deps.heroId);
    const hasKey = this.deps.inventoryManager.hasAccessibleQuantity(
      this.deps.heroId,
      definition.keyItemId,
      1,
    );

    return resolveDungeonAccessState({
      definitionTier: definition.tier,
      activityAvailable: this.deps.canStartDungeon(),
      researchUnlocked: this.deps.canAccessDungeonContent(definitionId),
      progressionUnlocked: this.deps.dungeonRuntime.canAccessDefinition(definitionId),
      hasWeapon: equipment.hasWeapon,
      ...(equipment.highestEquippedTier === undefined ? {} : { highestEquippedTier: equipment.highestEquippedTier }),
      hasKey,
    });
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
      (itemId, quantity) => this.deps.inventoryManager.removeAccessibleQuantity(
        this.deps.heroId,
        itemId,
        quantity,
      ),
    );

    this.pendingDefinitionId = null;
    this.deps.stopController.reset();
    if (started.ok) {
      dungeonCompletionFlow.begin(definitionId);
      worldTravelTransition.start();
    }
    this.deps.onStateChanged();
    return started.ok;
  }

  private notifyAccessFailure(definitionId: string, access: DungeonAccessState): void {
    const definition = this.deps.dungeonRuntime.getDefinition(definitionId);
    if (definition === undefined) return;

    let message: string | undefined;
    if (access.reason === "activity_busy") {
      message = "Accès refusé : terminez ou quittez l'activité de combat en cours.";
    } else if (access.reason === "research_locked") {
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

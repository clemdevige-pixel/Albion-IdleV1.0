import type { EntityId } from "@game/core";
import type { InventoryManager, ResourceFamily } from "@game/gameplay";
import type { GameBridge } from "../../game/GameBridge";
import type { CraftingRuntime } from "../../runtime/CraftingRuntime";
import type { CombatLoopState } from "../../runtime/CombatRuntime";
import { combatStopController } from "../../runtime/CombatStopController";
import type { GatheringRuntime } from "../../runtime/GatheringRuntime";
import type { RefiningRuntime } from "../../runtime/RefiningRuntime";
import { syncInventoryToBridge } from "../bridgeSync";
import type {
  ProductionBridgeAdapter,
  SupportedProductionFamily,
} from "./ProductionBridgeAdapter";
import {
  isSupportedProductionFamily,
  type ProductionTier,
} from "../../data/productionFamilyCatalog";

interface ProductionActionsDependencies {
  readonly bridge: GameBridge;
  readonly heroId: EntityId;
  readonly inventoryManager: InventoryManager;
  readonly gatheringRuntime: GatheringRuntime;
  readonly refiningRuntime: RefiningRuntime;
  readonly craftingRuntime: CraftingRuntime;
  readonly productionBridge: ProductionBridgeAdapter;
  readonly getCurrentTick: () => number;
  readonly getCombatLoopState: () => CombatLoopState;
  readonly getGatheringTier: () => ProductionTier;
  readonly prepareCombatResumeAfterGathering: () => void;
}

/** Thin application actions around authoritative Production runtimes. */
export class ProductionActions {
  private readonly deps: ProductionActionsDependencies;
  private queuedGatheringFamily: SupportedProductionFamily | null = null;

  constructor(deps: ProductionActionsDependencies) {
    this.deps = deps;
  }

  toggleGathering(family: SupportedProductionFamily): boolean {
    if (this.deps.gatheringRuntime.isHeroGathering()) {
      this.setQueuedGatheringFamily(null);

      const activeMiniGame = this.deps.gatheringRuntime.getActiveMiniGameState(family);
      const selectedTier = this.deps.getGatheringTier();
      const switchingTier = activeMiniGame.sessionId !== null
        && activeMiniGame.tier !== null
        && activeMiniGame.tier !== selectedTier;

      if (switchingTier) {
        this.deps.gatheringRuntime.stopAllGathering();
      }

      return this.applyGatheringToggle(family);
    }

    const loopState = this.deps.getCombatLoopState();
    if (loopState === "combat" || loopState === "stop_requested") {
      this.setQueuedGatheringFamily(family);
      if (combatStopController.getState() === "running") {
        combatStopController.requestStopAfterEncounter();
      }
      this.deps.bridge.addEconomyNotification({
        id: `notif_gather_queue_${String(Date.now())}`,
        type: "success",
        message: "Récolte programmée : départ à la fin du combat en cours.",
        timestamp: Date.now(),
      });
      return true;
    }

    this.setQueuedGatheringFamily(null);
    return this.applyGatheringToggle(family);
  }

  pollQueuedGathering(): void {
    const family = this.queuedGatheringFamily;
    if (family === null || !combatStopController.isPaused()) return;

    this.setQueuedGatheringFamily(null);
    // Gathering itself suspends combat. Resume the generic stop controller so
    // returning from gathering does not inherit the temporary encounter-stop.
    combatStopController.resume();
    this.applyGatheringToggle(family);
  }

  returnToCombat(): boolean {
    this.setQueuedGatheringFamily(null);
    if (!this.deps.gatheringRuntime.isHeroGathering()) return false;

    this.deps.gatheringRuntime.stopAllGathering();
    this.deps.productionBridge.syncAllGathering();
    this.deps.bridge.setCombatState("walking");
    return true;
  }

  performGatheringStrike(
    resourceFamily: string,
    quality: "miss" | "correct" | "perfect",
  ): boolean {
    if (!isSupportedProductionFamily(resourceFamily)) return false;
    const family: ResourceFamily = resourceFamily;
    const result = this.deps.gatheringRuntime.performGatheringStrike(
      family,
      quality,
      this.deps.getCurrentTick(),
    );
    if (!result.ok) return false;

    this.deps.productionBridge.syncGathering(resourceFamily);
    return true;
  }

  toggleRefining(family: SupportedProductionFamily): boolean {
    const result = this.toggleRefiningRuntime(family);
    syncInventoryToBridge(
      this.deps.bridge,
      this.deps.inventoryManager,
      this.deps.heroId,
    );
    this.deps.productionBridge.syncGathering(family);
    this.deps.productionBridge.syncRefining(family);
    return result.action === "started" || result.action === "stopped" || result.action === "completed";
  }

  craftEquipment(outputItemId: string): boolean {
    const result = this.deps.craftingRuntime.craftEquipment(outputItemId);
    if (!result.ok) return false;

    syncInventoryToBridge(
      this.deps.bridge,
      this.deps.inventoryManager,
      this.deps.heroId,
    );
    this.deps.productionBridge.syncAllRefining();
    this.deps.productionBridge.syncCrafting();
    this.deps.bridge.addEconomyNotification({
      id: `notif_craft_${String(Date.now())}`,
      type: "success",
      message: `Fabriqué : ${result.recipeName} · ${String(result.itemPower)} IP`,
      timestamp: Date.now(),
    });
    return true;
  }

  private setQueuedGatheringFamily(family: SupportedProductionFamily | null): void {
    this.queuedGatheringFamily = family;
    this.deps.bridge.updateQueuedGatheringFamily(family);
  }

  private applyGatheringToggle(family: SupportedProductionFamily): boolean {
    const result = this.toggleGatheringRuntime(family);

    if (result.action === "stopped") {
      this.deps.productionBridge.syncAllGathering();
      this.deps.bridge.setCombatState("walking");
      return true;
    }
    if (result.action === "started") {
      this.deps.prepareCombatResumeAfterGathering();
      this.deps.bridge.setCombatState("idle");
      this.deps.productionBridge.syncAllGathering();
      return true;
    }
    return false;
  }

  private toggleGatheringRuntime(family: SupportedProductionFamily) {
    return this.deps.gatheringRuntime.toggleGatheringFamily(
      family,
      this.deps.getCurrentTick(),
    );
  }

  private toggleRefiningRuntime(family: SupportedProductionFamily) {
    return this.deps.refiningRuntime.toggleRefiningFamily(
      family,
      this.deps.getCurrentTick(),
    );
  }
}

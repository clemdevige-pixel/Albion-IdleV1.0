import type { EntityId } from "@game/core";
import type { InventoryManager, ResourceFamily } from "@game/gameplay";
import type { GameBridge } from "../../game/GameBridge";
import type { CraftingRuntime } from "../../runtime/CraftingRuntime";
import type { GatheringRuntime } from "../../runtime/GatheringRuntime";
import type { RefiningRuntime } from "../../runtime/RefiningRuntime";
import { syncInventoryToBridge } from "../bridgeSync";
import type {
  ProductionBridgeAdapter,
  SupportedProductionFamily,
} from "./ProductionBridgeAdapter";
import { isSupportedProductionFamily } from "../../data/productionFamilyCatalog";

interface ProductionActionsDependencies {
  readonly bridge: GameBridge;
  readonly heroId: EntityId;
  readonly inventoryManager: InventoryManager;
  readonly gatheringRuntime: GatheringRuntime;
  readonly refiningRuntime: RefiningRuntime;
  readonly craftingRuntime: CraftingRuntime;
  readonly productionBridge: ProductionBridgeAdapter;
  readonly getCurrentTick: () => number;
  readonly prepareCombatResumeAfterGathering: () => void;
}

/** Thin application actions around authoritative Production runtimes. */
export class ProductionActions {
  private readonly deps: ProductionActionsDependencies;

  constructor(deps: ProductionActionsDependencies) {
    this.deps = deps;
  }

  toggleGathering(family: SupportedProductionFamily): boolean {
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

  returnToCombat(): boolean {
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
    return result.action === "started" || result.action === "stopped";
  }

  refineAllAvailable(): boolean {
    return this.deps.refiningRuntime
      .refineAllAvailable(this.deps.getCurrentTick())
      .startedAtLeastOne;
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


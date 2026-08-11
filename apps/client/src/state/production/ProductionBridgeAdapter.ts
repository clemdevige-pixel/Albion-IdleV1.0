import type { EntityId } from "@game/core";
import type {
  GatheringCoordinator,
  InventoryManager,
  RefiningManager,
  ResourceFamily,
} from "@game/gameplay";
import {
  EQUIPMENT_CRAFT_RECIPES,
  getClothRecipe,
  getLeatherRecipe,
  getMetalRecipe,
  getWoodRecipe,
} from "../../data/refiningRecipes";
import { getItemPower } from "../../data/itemPower";
import {
  FIBER_GATHERING_MASTERY_ID,
  HIDE_GATHERING_MASTERY_ID,
  ORE_GATHERING_MASTERY_ID,
  WOOD_GATHERING_MASTERY_ID,
  getRequiredGatheringMasteryForTier,
} from "../../data/progressionContentCatalog";
import type { GameBridge } from "../../game/GameBridge";
import type { GatheringRuntime } from "../../runtime/GatheringRuntime";
import type { RefiningRuntime } from "../../runtime/RefiningRuntime";
import {
  syncCraftingToBridge,
  syncGatheringToBridge,
  syncRefiningToBridge,
} from "../bridgeSync";

export type ProductionTier = 3 | 4;
export type SupportedProductionFamily = Extract<
  ResourceFamily,
  "Wood" | "Ore" | "Hide" | "Fiber"
>;

interface ProductionBridgeAdapterDependencies {
  readonly bridge: GameBridge;
  readonly inventoryManager: InventoryManager;
  readonly heroId: EntityId;
  readonly productionStorageId: EntityId;
  readonly gatheringRuntime: GatheringRuntime;
  readonly refiningRuntime: RefiningRuntime;
  readonly gatheringCoordinators: Readonly<Record<SupportedProductionFamily, GatheringCoordinator>>;
  readonly refiningManagers: Readonly<Record<SupportedProductionFamily, RefiningManager>>;
  readonly getCurrentTick: () => number;
  readonly getProductionTier: () => ProductionTier;
}

/** Projects authoritative Production runtimes into GameBridge view models. */
export class ProductionBridgeAdapter {
  private readonly deps: ProductionBridgeAdapterDependencies;

  constructor(deps: ProductionBridgeAdapterDependencies) {
    this.deps = deps;
  }

  syncGathering(family: SupportedProductionFamily): void {
    const { gatheringRuntime, inventoryManager, productionStorageId } = this.deps;
    const tier = this.deps.getProductionTier();
    const config = this.getFamilyConfig(family, tier);

    syncGatheringToBridge(
      config.updateGathering,
      this.deps.gatheringCoordinators[family].getActiveSession(),
      this.deps.getCurrentTick(),
      gatheringRuntime.getGatheringMasteryLevel(config.masteryId),
      getRequiredGatheringMasteryForTier(tier),
      gatheringRuntime.getGatheringDurationTicks(config.masteryId),
      config.resourceName,
      family,
      config.visualManifestId,
      tier,
      inventoryManager.getTotalQuantity(productionStorageId, config.recipe.rawItemId),
      gatheringRuntime.getActiveMiniGameState(family).strikesUsed,
    );
  }

  syncAllGathering(): void {
    for (const family of PRODUCTION_FAMILIES) this.syncGathering(family);
  }

  syncRefining(family: SupportedProductionFamily): void {
    const { inventoryManager, productionStorageId, refiningRuntime } = this.deps;
    const tier = this.deps.getProductionTier();
    const config = this.getFamilyConfig(family, tier);

    syncRefiningToBridge(
      config.updateRefining,
      this.deps.refiningManagers[family].getActiveSession(),
      this.deps.getCurrentTick(),
      config.recipe,
      refiningRuntime.getReservedInputs(family),
      inventoryManager,
      productionStorageId,
    );
  }

  syncAllRefining(): void {
    for (const family of PRODUCTION_FAMILIES) this.syncRefining(family);
  }

  syncCrafting(): void {
    const { bridge, heroId, inventoryManager, productionStorageId } = this.deps;
    const tier = this.deps.getProductionTier();

    syncCraftingToBridge(
      bridge,
      inventoryManager,
      heroId,
      productionStorageId,
      tier,
      {
        woodItemId: getWoodRecipe(tier).outputItemId,
        metalItemId: getMetalRecipe(tier).outputItemId,
        leatherItemId: getLeatherRecipe(tier).outputItemId,
        clothItemId: getClothRecipe(tier).outputItemId,
      },
      getItemPower,
      EQUIPMENT_CRAFT_RECIPES,
    );
  }

  private getFamilyConfig(family: SupportedProductionFamily, tier: ProductionTier) {
    const { bridge } = this.deps;

    switch (family) {
      case "Wood":
        return {
          masteryId: WOOD_GATHERING_MASTERY_ID,
          resourceName: tier === 4 ? "Bois de pin" : "Bois de bouleau",
          visualManifestId: "resource_wood",
          recipe: getWoodRecipe(tier),
          updateGathering: (vm: Parameters<GameBridge["updateGathering"]>[0]) => bridge.updateGathering(vm),
          updateRefining: (vm: Parameters<GameBridge["updateRefining"]>[0]) => bridge.updateRefining(vm),
        };
      case "Ore":
        return {
          masteryId: ORE_GATHERING_MASTERY_ID,
          resourceName: tier === 4 ? "Minerai de fer" : "Minerai de cuivre",
          visualManifestId: "resource_ore",
          recipe: getMetalRecipe(tier),
          updateGathering: (vm: Parameters<GameBridge["updateOreGathering"]>[0]) => bridge.updateOreGathering(vm),
          updateRefining: (vm: Parameters<GameBridge["updateMetalRefining"]>[0]) => bridge.updateMetalRefining(vm),
        };
      case "Hide":
        return {
          masteryId: HIDE_GATHERING_MASTERY_ID,
          resourceName: tier === 4 ? "Peau épaisse" : "Peau robuste",
          visualManifestId: "resource_hide",
          recipe: getLeatherRecipe(tier),
          updateGathering: (vm: Parameters<GameBridge["updateHideGathering"]>[0]) => bridge.updateHideGathering(vm),
          updateRefining: (vm: Parameters<GameBridge["updateLeatherRefining"]>[0]) => bridge.updateLeatherRefining(vm),
        };
      case "Fiber":
        return {
          masteryId: FIBER_GATHERING_MASTERY_ID,
          resourceName: tier === 4 ? "Fibre fine" : "Fibre de lin",
          visualManifestId: "resource_fiber",
          recipe: getClothRecipe(tier),
          updateGathering: (vm: Parameters<GameBridge["updateFiberGathering"]>[0]) => bridge.updateFiberGathering(vm),
          updateRefining: (vm: Parameters<GameBridge["updateClothRefining"]>[0]) => bridge.updateClothRefining(vm),
        };
    }
  }
}

const PRODUCTION_FAMILIES: readonly SupportedProductionFamily[] = [
  "Wood",
  "Ore",
  "Hide",
  "Fiber",
];

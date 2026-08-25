import type { EntityId } from "@game/core";
import type { GatheringCoordinator, InventoryManager, RefiningManager } from "@game/gameplay";
import {
  getClothRecipe,
  getLeatherRecipe,
  getMetalRecipe,
  getProductionRefiningRecipe,
  getWoodRecipe,
} from "../../data/refiningRecipes";
import { RESOURCE_TIER_CONTENT } from "../../data/resourceContentCatalog";
import { ALL_CRAFT_RECIPES } from "../../data/specialCraftRecipes";
import { getItemPower } from "../../data/itemPower";
import { getRequiredGatheringMasteryForTier } from "../../data/progressionContentCatalog";
import {
  GATHERING_CONTENT_TIERS,
  PRODUCTION_FAMILIES,
  getProductionFamilyByGameplayFamily,
  getProductionFamilyId,
  requireProductionTierPresentation,
  type ProductionFamilyId,
  type ProductionTier,
  type SupportedProductionFamily,
} from "../../data/productionFamilyCatalog";
import type { GameBridge } from "../../game/GameBridge";
import type { GatheringRuntime } from "../../runtime/GatheringRuntime";
import type { RefiningRuntime } from "../../runtime/RefiningRuntime";
import {
  syncCraftingToBridge,
  syncGatheringToBridge,
  syncRefiningToBridge,
} from "../bridgeSync";

export type { ProductionTier, SupportedProductionFamily } from "../../data/productionFamilyCatalog";

type GatheringContentTier = (typeof GATHERING_CONTENT_TIERS)[number];

function isGatheringContentTier(tier: ProductionTier): tier is GatheringContentTier {
  return GATHERING_CONTENT_TIERS.some((authoredTier) => authoredTier === tier);
}

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
  readonly getGatheringTier: () => ProductionTier;
  readonly getRefiningTier: (family: SupportedProductionFamily) => ProductionTier;
  readonly getCraftingTier: () => ProductionTier;
}

export function syncCraftingProjection(
  bridge: GameBridge,
  inventoryManager: InventoryManager,
  heroId: EntityId,
  productionStorageId: EntityId,
  tier: ProductionTier,
): void {
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
    ALL_CRAFT_RECIPES,
  );
}

/** Projects authoritative Production runtimes into GameBridge view models. */
export class ProductionBridgeAdapter {
  private readonly deps: ProductionBridgeAdapterDependencies;

  constructor(deps: ProductionBridgeAdapterDependencies) {
    this.deps = deps;
  }

  syncGathering(family: SupportedProductionFamily): void {
    const { gatheringRuntime, inventoryManager, productionStorageId } = this.deps;
    const tier = this.deps.getGatheringTier();
    const config = this.getGatheringConfig(family, tier);
    const session = this.deps.gatheringCoordinators[family].getActiveSession();
    const miniGame = gatheringRuntime.getActiveMiniGameState(family);
    const activeTier = session === undefined ? undefined : miniGame.tier ?? tier;
    const activeResource = activeTier === undefined
      ? undefined
      : {
          resourceName: this.getGatheringConfig(family, activeTier).resourceName,
          resourceTier: activeTier,
        };

    syncGatheringToBridge(
      config.updateGathering,
      session,
      this.deps.getCurrentTick(),
      gatheringRuntime.getGatheringMasteryLevel(config.masteryId),
      getRequiredGatheringMasteryForTier(tier),
      gatheringRuntime.getGatheringDurationTicks(config.masteryId),
      config.resourceName,
      family,
      config.visualManifestId,
      tier,
      inventoryManager.getTotalQuantity(productionStorageId, config.rawItemId),
      miniGame.strikesUsed,
      activeResource,
    );
  }

  syncAllGathering(): void {
    for (const family of PRODUCTION_FAMILIES) this.syncGathering(family);
  }

  syncRefining(family: SupportedProductionFamily): void {
    const { inventoryManager, productionStorageId, refiningRuntime } = this.deps;
    const tier = this.deps.getRefiningTier(family);
    const config = this.getRefiningConfig(family, tier);
    const activeSession = this.deps.refiningManagers[family].getActiveSession();
    const session = activeSession ?? (
      refiningRuntime.isAutomaticEnabled(family)
        ? {
            getRequiredTicks: () => config.recipe.durationTicks,
            getProgress: () => 0,
          }
        : undefined
    );

    syncRefiningToBridge(
      config.updateRefining,
      session,
      refiningRuntime.getRuntimeTick(this.deps.getCurrentTick()),
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
    syncCraftingProjection(
      this.deps.bridge,
      this.deps.inventoryManager,
      this.deps.heroId,
      this.deps.productionStorageId,
      this.deps.getCraftingTier(),
    );
  }

  private getGatheringConfig(family: SupportedProductionFamily, tier: ProductionTier) {
    if (!isGatheringContentTier(tier)) {
      throw new Error(`Gathering content missing for ${family} T${String(tier)}`);
    }

    const { bridge } = this.deps;
    const id = getProductionFamilyId(family);
    const definition = getProductionFamilyByGameplayFamily(family);
    const resource = RESOURCE_TIER_CONTENT[id][tier];
    return {
      masteryId: definition.masteryId,
      resourceName: requireProductionTierPresentation(family, tier).resourceName,
      visualManifestId: definition.visualManifestId,
      rawItemId: resource.rawItemId,
      updateGathering: GATHERING_UPDATERS[id](bridge),
    };
  }

  private getRefiningConfig(family: SupportedProductionFamily, tier: ProductionTier) {
    const { bridge } = this.deps;
    const id = getProductionFamilyId(family);
    return {
      recipe: getProductionRefiningRecipe(id, tier),
      updateRefining: REFINING_UPDATERS[id](bridge),
    };
  }
}

type GatheringUpdater = (vm: Parameters<GameBridge["updateGathering"]>[0]) => void;
type RefiningUpdater = (vm: Parameters<GameBridge["updateRefining"]>[0]) => void;

const GATHERING_UPDATERS = {
  wood: (bridge: GameBridge): GatheringUpdater => (vm) => bridge.updateGathering(vm),
  ore: (bridge: GameBridge): GatheringUpdater => (vm) => bridge.updateOreGathering(vm),
  hide: (bridge: GameBridge): GatheringUpdater => (vm) => bridge.updateHideGathering(vm),
  fiber: (bridge: GameBridge): GatheringUpdater => (vm) => bridge.updateFiberGathering(vm),
} satisfies Record<ProductionFamilyId, (bridge: GameBridge) => GatheringUpdater>;

const REFINING_UPDATERS = {
  wood: (bridge: GameBridge): RefiningUpdater => (vm) => bridge.updateRefining(vm),
  ore: (bridge: GameBridge): RefiningUpdater => (vm) => bridge.updateMetalRefining(vm),
  hide: (bridge: GameBridge): RefiningUpdater => (vm) => bridge.updateLeatherRefining(vm),
  fiber: (bridge: GameBridge): RefiningUpdater => (vm) => bridge.updateClothRefining(vm),
} satisfies Record<ProductionFamilyId, (bridge: GameBridge) => RefiningUpdater>;

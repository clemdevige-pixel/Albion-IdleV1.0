import type { ProductionTier } from "../../data/productionFamilyCatalog.js";
import type { EntityId } from "@game/core";
import {
  GatheringCoordinator,
  GatheringManager,
  GatheringToolRegistry,
  RefiningManager,
  ResourceNodeManager,
  ResourceNodeRegistry,
  ResourceRegistry,
  ResourceRuntime,
  type CurrencyService,
  type DurabilityStore,
  type ExperienceService,
  type InventoryManager,
  type MasteryService,
  type ProgressionOrchestrator,
  type WalletId,
  type ZoneDefinitionId,
} from "@game/gameplay";
import { EQUIPMENT_CRAFT_RECIPES } from "../../data/refiningRecipes.js";
import { FACTION_CAPE_CRAFT_RECIPES } from "../../data/factionCapeContentCatalog.js";
import { getItemPower } from "../../data/itemPower.js";
import { setupResourceContentCatalog } from "../../data/resourceContentCatalog.js";
import { getRequiredGatheringMasteryForTier } from "../../data/progressionContentCatalog.js";
import type { SupportedProductionFamily } from "../../data/productionFamilyCatalog.js";
import { CraftingRuntime } from "../CraftingRuntime.js";
import { GatheringRuntime } from "../GatheringRuntime.js";
import { RefiningRuntime } from "../RefiningRuntime.js";
import { WorkerRuntime } from "../WorkerRuntime.js";
import { createAtomicProductionInventoryManager } from "../AtomicProductionInventory.js";

interface ProductionFoundationDependencies {
  readonly inventoryManager: InventoryManager;
  readonly masteryService: MasteryService;
  readonly experienceService: ExperienceService;
  readonly progressionOrchestrator: ProgressionOrchestrator;
  readonly heroId: EntityId;
  readonly productionStorageId: EntityId;
  readonly durabilityStore: DurabilityStore;
  readonly currencyService: CurrencyService;
  readonly walletId: WalletId;
  readonly forestZoneDefId: ZoneDefinitionId;
  readonly getGatheringTier: () => ProductionTier;
  readonly getRefiningTier: (family: SupportedProductionFamily) => ProductionTier;
  readonly getWorkerTier: () => ProductionTier;
}

/**
 * Framework-agnostic assembly for gathering, refining, crafting and workers.
 * Each runtime remains an independent domain; this function only wires them.
 */
export function createProductionFoundation({
  inventoryManager,
  masteryService,
  experienceService,
  progressionOrchestrator,
  heroId,
  productionStorageId,
  durabilityStore,
  currencyService,
  walletId,
  forestZoneDefId,
  getGatheringTier,
  getRefiningTier,
  getWorkerTier,
}: ProductionFoundationDependencies) {
  const productionInventoryManager = createAtomicProductionInventoryManager(
    inventoryManager,
  );
  const resourceRegistry = new ResourceRegistry();
  const resourceRuntime = new ResourceRuntime();
  const resourceNodeRegistry = new ResourceNodeRegistry();
  const resourceNodeManager = new ResourceNodeManager();
  const gatheringManagers = {
    Wood: new GatheringManager(resourceRegistry),
    Ore: new GatheringManager(resourceRegistry),
    Hide: new GatheringManager(resourceRegistry),
    Fiber: new GatheringManager(resourceRegistry),
  } as const;
  const gatheringToolRegistry = new GatheringToolRegistry();

  const nodesAndTools = setupResourceContentCatalog({
    resourceRegistry,
    resourceRuntime,
    resourceNodeRegistry,
    resourceNodeManager,
    gatheringToolRegistry,
    forestZoneDefId,
  });

  resourceRuntime.events.subscribe("resourceDepleted", ({ resourceId }) => {
    resourceRuntime.restore(resourceId);
  });

  const createGatheringCoordinator = (
    gatheringManagerForFamily: GatheringManager,
  ): GatheringCoordinator => new GatheringCoordinator(
    resourceRegistry,
    resourceRuntime,
    resourceNodeRegistry,
    resourceNodeManager,
    gatheringManagerForFamily,
    gatheringToolRegistry,
  );

  const gatheringCoordinators = {
    Wood: createGatheringCoordinator(gatheringManagers.Wood),
    Ore: createGatheringCoordinator(gatheringManagers.Ore),
    Hide: createGatheringCoordinator(gatheringManagers.Hide),
    Fiber: createGatheringCoordinator(gatheringManagers.Fiber),
  } as const;

  const gatheringFamilies = {
    Wood: { manager: gatheringManagers.Wood, coordinator: gatheringCoordinators.Wood },
    Ore: { manager: gatheringManagers.Ore, coordinator: gatheringCoordinators.Ore },
    Hide: { manager: gatheringManagers.Hide, coordinator: gatheringCoordinators.Hide },
    Fiber: { manager: gatheringManagers.Fiber, coordinator: gatheringCoordinators.Fiber },
  } as const;

  const gatheringRuntime = new GatheringRuntime({
    gatheringFamilies,
    inventoryManager: productionInventoryManager,
    masteryService,
    experienceService,
    progressionOrchestrator,
    productionStorageId,
    nodesAndTools,
    getProductionTier: getGatheringTier,
  });

  const gatheringCoordinator = gatheringCoordinators.Wood;
  const oreGatheringCoordinator = gatheringCoordinators.Ore;
  const hideGatheringCoordinator = gatheringCoordinators.Hide;
  const fiberGatheringCoordinator = gatheringCoordinators.Fiber;

  const refiningManager = new RefiningManager();
  const metalRefiningManager = new RefiningManager();
  const leatherRefiningManager = new RefiningManager();
  const clothRefiningManager = new RefiningManager();

  const refiningManagers = {
    Wood: refiningManager,
    Ore: metalRefiningManager,
    Hide: leatherRefiningManager,
    Fiber: clothRefiningManager,
  } as const;

  const refiningRuntime = new RefiningRuntime({
    refiningManagers,
    inventoryManager: productionInventoryManager,
    productionStorageId,
    getProductionTier: getRefiningTier,
  });

  const craftingRuntime = new CraftingRuntime({
    inventoryManager,
    heroId,
    productionStorageId,
    durabilityStore,
    recipes: [
      ...EQUIPMENT_CRAFT_RECIPES,
      ...FACTION_CAPE_CRAFT_RECIPES,
    ],
    getItemPower,
  });

  const workerRuntime = new WorkerRuntime({
    inventoryManager: productionInventoryManager,
    productionStorageId,
    currencyService,
    walletId,
    experienceService,
    getProductionTier: getWorkerTier,
    getRequiredGatheringMasteryForTier,
  });

  workerRuntime.subscribeDomainEvent((event) => {
    if (event.type === "storage_full") {
      workerRuntime.toggleWorker(event.profession);
    }
  });

  return {
    gatheringRuntime,
    refiningRuntime,
    craftingRuntime,
    workerRuntime,
    gatheringCoordinator,
    oreGatheringCoordinator,
    hideGatheringCoordinator,
    fiberGatheringCoordinator,
    refiningManager,
    metalRefiningManager,
    leatherRefiningManager,
    clothRefiningManager,
  };
}

export type ProductionFoundation = ReturnType<typeof createProductionFoundation>;

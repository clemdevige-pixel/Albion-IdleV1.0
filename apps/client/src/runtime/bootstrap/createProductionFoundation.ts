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
import { getItemPower } from "../../data/itemPower.js";
import { setupResourceContentCatalog } from "../../data/resourceContentCatalog.js";
import { getRequiredGatheringMasteryForTier } from "../../data/progressionContentCatalog.js";
import { CraftingRuntime } from "../CraftingRuntime.js";
import { GatheringRuntime } from "../GatheringRuntime.js";
import { RefiningRuntime } from "../RefiningRuntime.js";
import { WorkerRuntime } from "../WorkerRuntime.js";

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
  readonly getProductionTier: () => ProductionTier;
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
  getProductionTier,
}: ProductionFoundationDependencies) {
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

  // Production nodes are renewable; preserve the long-session safeguard.
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
    Wood: {
      manager: gatheringManagers.Wood,
      coordinator: gatheringCoordinators.Wood,
    },
    Ore: {
      manager: gatheringManagers.Ore,
      coordinator: gatheringCoordinators.Ore,
    },
    Hide: {
      manager: gatheringManagers.Hide,
      coordinator: gatheringCoordinators.Hide,
    },
    Fiber: {
      manager: gatheringManagers.Fiber,
      coordinator: gatheringCoordinators.Fiber,
    },
  } as const;

  const gatheringRuntime = new GatheringRuntime({
    gatheringFamilies,
    inventoryManager,
    masteryService,
    experienceService,
    progressionOrchestrator,
    productionStorageId,
    nodesAndTools: {
      Wood: {
        3: {
          nodeId: nodesAndTools.birchNode.id,
          tool: nodesAndTools.starterAxe,
        },
        4: {
          nodeId: nodesAndTools.pineNode.id,
          tool: nodesAndTools.tier4Axe,
        },
      },
      Ore: {
        3: {
          nodeId: nodesAndTools.copperNode.id,
          tool: nodesAndTools.starterPickaxe,
        },
        4: {
          nodeId: nodesAndTools.ironNode.id,
          tool: nodesAndTools.tier4Pickaxe,
        },
      },
      Hide: {
        3: {
          nodeId: nodesAndTools.sturdyHideNode.id,
          tool: nodesAndTools.starterSkinningKnife,
        },
        4: {
          nodeId: nodesAndTools.thickHideNode.id,
          tool: nodesAndTools.tier4SkinningKnife,
        },
      },
      Fiber: {
        3: {
          nodeId: nodesAndTools.linenFiberNode.id,
          tool: nodesAndTools.starterSickle,
        },
        4: {
          nodeId: nodesAndTools.fineFiberNode.id,
          tool: nodesAndTools.tier4Sickle,
        },
      },
    },
    getProductionTier,
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
    inventoryManager,
    productionStorageId,
    getProductionTier,
  });

  const craftingRuntime = new CraftingRuntime({
    inventoryManager,
    heroId,
    productionStorageId,
    durabilityStore,
    recipes: EQUIPMENT_CRAFT_RECIPES,
    getItemPower,
  });

  const workerRuntime = new WorkerRuntime({
    inventoryManager,
    productionStorageId,
    currencyService,
    walletId,
    experienceService,
    getProductionTier,
    getRequiredGatheringMasteryForTier,
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

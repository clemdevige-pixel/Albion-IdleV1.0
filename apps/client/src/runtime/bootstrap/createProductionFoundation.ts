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
  readonly getProductionTier: () => 3 | 4;
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
  const gatheringManager = new GatheringManager(resourceRegistry);
  const oreGatheringManager = new GatheringManager(resourceRegistry);
  const hideGatheringManager = new GatheringManager(resourceRegistry);
  const fiberGatheringManager = new GatheringManager(resourceRegistry);
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

  const gatheringCoordinator = createGatheringCoordinator(gatheringManager);
  const oreGatheringCoordinator = createGatheringCoordinator(oreGatheringManager);
  const hideGatheringCoordinator = createGatheringCoordinator(hideGatheringManager);
  const fiberGatheringCoordinator = createGatheringCoordinator(fiberGatheringManager);

  const gatheringRuntime = new GatheringRuntime({
    gatheringCoordinator,
    gatheringManager,
    oreGatheringCoordinator,
    oreGatheringManager,
    hideGatheringCoordinator,
    hideGatheringManager,
    fiberGatheringCoordinator,
    fiberGatheringManager,
    inventoryManager,
    masteryService,
    experienceService,
    progressionOrchestrator,
    productionStorageId,
    nodesAndTools: {
      birchNodeId: nodesAndTools.birchNode.id,
      pineNodeId: nodesAndTools.pineNode.id,
      copperNodeId: nodesAndTools.copperNode.id,
      ironNodeId: nodesAndTools.ironNode.id,
      sturdyHideNodeId: nodesAndTools.sturdyHideNode.id,
      thickHideNodeId: nodesAndTools.thickHideNode.id,
      linenFiberNodeId: nodesAndTools.linenFiberNode.id,
      fineFiberNodeId: nodesAndTools.fineFiberNode.id,
      starterAxe: nodesAndTools.starterAxe,
      tier4Axe: nodesAndTools.tier4Axe,
      starterPickaxe: nodesAndTools.starterPickaxe,
      tier4Pickaxe: nodesAndTools.tier4Pickaxe,
      starterSkinningKnife: nodesAndTools.starterSkinningKnife,
      tier4SkinningKnife: nodesAndTools.tier4SkinningKnife,
      starterSickle: nodesAndTools.starterSickle,
      tier4Sickle: nodesAndTools.tier4Sickle,
    },
    getProductionTier,
  });

  const refiningManager = new RefiningManager();
  const metalRefiningManager = new RefiningManager();
  const leatherRefiningManager = new RefiningManager();
  const clothRefiningManager = new RefiningManager();
  const refiningRuntime = new RefiningRuntime({
    refiningManager,
    metalRefiningManager,
    leatherRefiningManager,
    clothRefiningManager,
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

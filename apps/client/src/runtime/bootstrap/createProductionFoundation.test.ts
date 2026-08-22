import { describe, expect, it } from "vitest";
import { EquipmentManager, InventoryManager } from "@game/gameplay";
import { resolveEquipmentInfo, resolveItemStackInfo } from "../../data/itemContentCatalog";
import { ADVANCED_WORKER_ORGANIZATION } from "../../data/workerContentCatalog";
import { createCombatFoundation } from "./createCombatFoundation";
import { createEconomyFoundation } from "./createEconomyFoundation";
import { createProductionFoundation } from "./createProductionFoundation";
import { createProgressionFoundation } from "./createProgressionFoundation";
import { createWorldFoundation } from "./createWorldFoundation";

describe("createProductionFoundation", () => {
  it("assembles independent gathering, refining, crafting and worker runtimes", () => {
    const combat = createCombatFoundation();
    const progression = createProgressionFoundation();
    const world = createWorldFoundation();
    const inventoryManager = new InventoryManager(combat.world, resolveItemStackInfo);
    const equipmentManager = new EquipmentManager(
      combat.world,
      inventoryManager,
      resolveEquipmentInfo,
    );
    const economy = createEconomyFoundation({ inventoryManager, equipmentManager });
    const heroId = combat.world.createEntity();
    const productionStorageId = combat.world.createEntity();
    inventoryManager.createInventory(heroId, 24);
    inventoryManager.createInventory(productionStorageId, 256);

    const production = createProductionFoundation({
      inventoryManager,
      masteryService: progression.masteryService,
      experienceService: progression.experienceService,
      progressionOrchestrator: progression.progressionOrchestrator,
      heroId,
      productionStorageId,
      durabilityStore: economy.durabilityStore,
      currencyService: economy.currencyService,
      walletId: economy.walletId,
      forestZoneDefId: world.forestZoneDefId,
      getGatheringTier: () => 3,
      getRefiningTier: () => 3,
      getWorkerTier: () => 3,
    });

    expect(production.gatheringRuntime.isHeroGathering()).toBe(false);
    expect(production.workerRuntime.getAllWorkers()).toEqual([]);
    expect(production.refiningManager.getActiveSession()).toBeUndefined();

    production.gatheringCoordinator.dispose();
    production.oreGatheringCoordinator.dispose();
    production.hideGatheringCoordinator.dispose();
    production.fiberGatheringCoordinator.dispose();
    combat.orchestrator.dispose();
  });

  it("reads worker capacity and recruitment cost from the injected live policy", () => {
    const combat = createCombatFoundation();
    const progression = createProgressionFoundation();
    const world = createWorldFoundation();
    const inventoryManager = new InventoryManager(combat.world, resolveItemStackInfo);
    const equipmentManager = new EquipmentManager(combat.world, inventoryManager, resolveEquipmentInfo);
    const economy = createEconomyFoundation({ inventoryManager, equipmentManager });
    const heroId = combat.world.createEntity();
    const productionStorageId = combat.world.createEntity();
    inventoryManager.createInventory(heroId, 24);
    inventoryManager.createInventory(productionStorageId, 256);
    let advanced = false;

    const production = createProductionFoundation({
      inventoryManager,
      masteryService: progression.masteryService,
      experienceService: progression.experienceService,
      progressionOrchestrator: progression.progressionOrchestrator,
      heroId,
      productionStorageId,
      durabilityStore: economy.durabilityStore,
      currencyService: economy.currencyService,
      walletId: economy.walletId,
      forestZoneDefId: world.forestZoneDefId,
      getGatheringTier: () => 3,
      getRefiningTier: () => 3,
      getWorkerTier: () => 3,
      getWorkerCapacity: () => advanced ? ADVANCED_WORKER_ORGANIZATION.workerCapacity : 4,
      getWorkerProfessionCapacity: () => advanced ? ADVANCED_WORKER_ORGANIZATION.professionCapacity : 1,
      getWorkerRecruitmentCost: () => advanced ? ADVANCED_WORKER_ORGANIZATION.recruitmentCost : 250,
    });

    expect(production.workerRuntime.getCapacity()).toBe(4);
    expect(production.workerRuntime.getProfessionCapacity("woodcutter")).toBe(1);
    expect(production.workerRuntime.getRecruitmentCost()).toBe(250);

    advanced = true;

    expect(production.workerRuntime.getCapacity()).toBe(8);
    expect(production.workerRuntime.getProfessionCapacity("woodcutter")).toBe(2);
    expect(production.workerRuntime.getRecruitmentCost()).toBe(5_000);

    production.gatheringCoordinator.dispose();
    production.oreGatheringCoordinator.dispose();
    production.hideGatheringCoordinator.dispose();
    production.fiberGatheringCoordinator.dispose();
    combat.orchestrator.dispose();
  });
});

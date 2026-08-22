import { describe, expect, it } from "vitest";
import { EquipmentManager, InventoryManager } from "@game/gameplay";
import { resolveEquipmentInfo, resolveItemStackInfo } from "../../data/itemContentCatalog";
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

  it("supports two independent workers in the same profession when capacity allows it", () => {
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
    economy.currencyService.credit(economy.walletId, "currency_silver", 10_000);

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
      getWorkerCapacity: () => 8,
      getWorkerProfessionCapacity: () => 2,
    });

    const first = production.workerRuntime.recruitWorker("woodcutter");
    const second = production.workerRuntime.recruitWorker("woodcutter");
    expect(first.ok).toBe(true);
    expect(second.ok).toBe(true);
    if (!first.ok || !second.ok) throw new Error("Expected both workers to be recruited");
    expect(first.workerId).not.toBe(second.workerId);
    expect(production.workerRuntime.getWorkersByProfession("woodcutter")).toHaveLength(2);

    expect(production.workerRuntime.toggleWorker(first.workerId, 3).ok).toBe(true);
    expect(production.workerRuntime.toggleWorker(second.workerId, 3).ok).toBe(true);
    expect(production.workerRuntime.getWorkerSession(first.workerId)?.state).toBe("executing");
    expect(production.workerRuntime.getWorkerSession(second.workerId)?.state).toBe("executing");

    production.gatheringCoordinator.dispose();
    production.oreGatheringCoordinator.dispose();
    production.hideGatheringCoordinator.dispose();
    production.fiberGatheringCoordinator.dispose();
    combat.orchestrator.dispose();
  });
});

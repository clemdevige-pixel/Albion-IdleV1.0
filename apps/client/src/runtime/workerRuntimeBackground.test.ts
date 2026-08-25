import { describe, expect, it } from "vitest";
import { EquipmentManager, InventoryManager } from "@game/gameplay";
import { resolveEquipmentInfo, resolveItemStackInfo } from "../data/itemContentCatalog";
import { createCombatFoundation } from "./bootstrap/createCombatFoundation";
import { createEconomyFoundation } from "./bootstrap/createEconomyFoundation";
import { createProductionFoundation } from "./bootstrap/createProductionFoundation";
import { createProgressionFoundation } from "./bootstrap/createProgressionFoundation";
import { createWorldFoundation } from "./bootstrap/createWorldFoundation";

function createWorkerEnvironment() {
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
  economy.currencyService.credit(economy.walletId, "currency_silver", 1_000_000);

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

  const dispose = (): void => {
    production.gatheringCoordinator.dispose();
    production.oreGatheringCoordinator.dispose();
    production.hideGatheringCoordinator.dispose();
    production.fiberGatheringCoordinator.dispose();
    combat.orchestrator.dispose();
  };

  return {
    production,
    inventoryManager,
    productionStorageId,
    dispose,
  };
}

describe("WorkerRuntime background progression", () => {
  it("completes an active worker cycle and restarts it without replaying live ticks", () => {
    const env = createWorkerEnvironment();
    try {
      const recruited = env.production.workerRuntime.recruitWorker("woodcutter");
      expect(recruited.ok).toBe(true);
      if (!recruited.ok) return;

      expect(env.production.workerRuntime.toggleWorker(recruited.workerId, 3).ok).toBe(true);
      const session = env.production.workerRuntime.getWorkerSession(recruited.workerId);
      expect(session?.totalTicks).toBeDefined();
      const totalTicks = session?.totalTicks ?? 0;

      env.production.workerRuntime.resolveBackground(totalTicks * 500, 500);

      expect(
        env.inventoryManager.getTotalQuantity(
          env.productionStorageId,
          "item_resource_wood_t3",
        ),
      ).toBeGreaterThan(0);
      expect(env.production.workerRuntime.getAllWorkers()[0]?.mastery ?? 0).toBeGreaterThan(0);
      expect(env.production.workerRuntime.getWorkerSession(recruited.workerId)?.state).toBe("executing");
    } finally {
      env.dispose();
    }
  });

  it("does not advance a paused worker", () => {
    const env = createWorkerEnvironment();
    try {
      const recruited = env.production.workerRuntime.recruitWorker("woodcutter");
      expect(recruited.ok).toBe(true);
      if (!recruited.ok) return;

      expect(env.production.workerRuntime.toggleWorker(recruited.workerId, 3).ok).toBe(true);
      expect(env.production.workerRuntime.toggleWorker(recruited.workerId, 3).ok).toBe(true);
      expect(env.production.workerRuntime.getWorkerSession(recruited.workerId)?.state).toBe("paused");

      env.production.workerRuntime.resolveBackground(60_000, 500);

      expect(
        env.inventoryManager.getTotalQuantity(
          env.productionStorageId,
          "item_resource_wood_t3",
        ),
      ).toBe(0);
      expect(env.production.workerRuntime.getAllWorkers()[0]?.mastery ?? 0).toBe(0);
    } finally {
      env.dispose();
    }
  });
});

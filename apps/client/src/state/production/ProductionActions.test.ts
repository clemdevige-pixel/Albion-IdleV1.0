import { afterEach, describe, expect, it, vi } from "vitest";
import { combatStopController } from "../../runtime/CombatStopController";
import { ProductionActions } from "./ProductionActions";

function createHarness() {
  const bridge = {
    combatState: "combat" as const,
    updateQueuedGatheringFamily: vi.fn(),
    addEconomyNotification: vi.fn(),
    setCombatState: vi.fn(),
  };
  const gatheringRuntime = {
    isHeroGathering: vi.fn(() => false),
    toggleGatheringFamily: vi.fn(() => ({ action: "started" as const, family: "Wood" as const })),
    stopAllGathering: vi.fn(),
    performGatheringStrike: vi.fn(),
  };
  const productionBridge = {
    syncAllGathering: vi.fn(),
    syncGathering: vi.fn(),
    syncRefining: vi.fn(),
    syncAllRefining: vi.fn(),
    syncCrafting: vi.fn(),
  };
  const actions = new ProductionActions({
    bridge: bridge as never,
    heroId: 1 as never,
    inventoryManager: {} as never,
    gatheringRuntime: gatheringRuntime as never,
    refiningRuntime: {} as never,
    craftingRuntime: {} as never,
    productionBridge: productionBridge as never,
    getCurrentTick: () => 42,
    prepareCombatResumeAfterGathering: vi.fn(),
  });

  return { actions, bridge, gatheringRuntime, productionBridge };
}

afterEach(() => {
  combatStopController.reset();
});

describe("ProductionActions gathering queue lifecycle", () => {
  it("queues gathering during combat and starts it only after the segment stop", () => {
    const harness = createHarness();

    expect(harness.actions.toggleGathering("Wood")).toBe(true);
    expect(combatStopController.isStopRequested()).toBe(true);
    expect(harness.bridge.updateQueuedGatheringFamily).toHaveBeenCalledWith("Wood");
    expect(harness.gatheringRuntime.toggleGatheringFamily).not.toHaveBeenCalled();

    expect(combatStopController.pauseAfterSegment()).toBe(true);
    harness.actions.pollQueuedGathering();

    expect(combatStopController.getState()).toBe("running");
    expect(harness.bridge.updateQueuedGatheringFamily).toHaveBeenLastCalledWith(null);
    expect(harness.gatheringRuntime.toggleGatheringFamily).toHaveBeenCalledWith("Wood", 42);
    expect(harness.bridge.setCombatState).toHaveBeenCalledWith("idle");
    expect(harness.productionBridge.syncAllGathering).toHaveBeenCalledOnce();
  });
});

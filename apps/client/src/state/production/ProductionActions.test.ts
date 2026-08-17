import { afterEach, describe, expect, it, vi } from "vitest";
import type { CombatLoopState } from "../../runtime/CombatRuntime";
import { combatStopController } from "../../runtime/CombatStopController";
import { ProductionActions } from "./ProductionActions";

function createHarness(loopState: CombatLoopState = "combat") {
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
  const prepareCombatResumeAfterGathering = vi.fn();
  const actions = new ProductionActions({
    bridge: bridge as never,
    heroId: 1 as never,
    inventoryManager: {} as never,
    gatheringRuntime: gatheringRuntime as never,
    refiningRuntime: {} as never,
    craftingRuntime: {} as never,
    productionBridge: productionBridge as never,
    getCurrentTick: () => 42,
    getCombatLoopState: () => loopState,
    prepareCombatResumeAfterGathering,
  });

  return {
    actions,
    bridge,
    gatheringRuntime,
    productionBridge,
    prepareCombatResumeAfterGathering,
  };
}

afterEach(() => {
  combatStopController.reset();
});

describe("ProductionActions gathering queue lifecycle", () => {
  it.each(["combat", "stop_requested"] as const)(
    "queues gathering while combat loop is %s",
    (loopState) => {
      const harness = createHarness(loopState);
      if (loopState === "stop_requested") {
        expect(combatStopController.requestStopAfterEncounter()).toBe(true);
      }

      expect(harness.actions.toggleGathering("Wood")).toBe(true);
      expect(combatStopController.isStopRequested()).toBe(true);
      expect(harness.bridge.updateQueuedGatheringFamily).toHaveBeenCalledWith("Wood");
      expect(harness.gatheringRuntime.toggleGatheringFamily).not.toHaveBeenCalled();
    },
  );

  it("starts queued gathering only after the current encounter ends", () => {
    const harness = createHarness("combat");

    expect(harness.actions.toggleGathering("Wood")).toBe(true);
    expect(combatStopController.pauseAfterEncounter()).toBe(true);
    harness.actions.pollQueuedGathering();

    expect(combatStopController.getState()).toBe("running");
    expect(harness.bridge.updateQueuedGatheringFamily).toHaveBeenLastCalledWith(null);
    expect(harness.gatheringRuntime.toggleGatheringFamily).toHaveBeenCalledWith("Wood", 42);
    expect(harness.bridge.setCombatState).toHaveBeenCalledWith("idle");
    expect(harness.productionBridge.syncAllGathering).toHaveBeenCalledOnce();
  });

  it("announces that queued gathering waits only for the current fight", () => {
    const harness = createHarness("combat");

    expect(harness.actions.toggleGathering("Wood")).toBe(true);
    expect(harness.bridge.addEconomyNotification).toHaveBeenCalledWith(
      expect.objectContaining({
        message: "Récolte programmée : départ à la fin du combat en cours.",
      }),
    );
  });

  it.each(["paused", "defeat", "idle", "suspended"] as const)(
    "starts gathering immediately while combat loop is %s",
    (loopState) => {
      const harness = createHarness(loopState);

      expect(harness.actions.toggleGathering("Wood")).toBe(true);
      expect(harness.bridge.updateQueuedGatheringFamily).toHaveBeenLastCalledWith(null);
      expect(harness.gatheringRuntime.toggleGatheringFamily).toHaveBeenCalledWith("Wood", 42);
      expect(combatStopController.isStopRequested()).toBe(false);
      expect(harness.prepareCombatResumeAfterGathering).toHaveBeenCalledOnce();
    },
  );
});

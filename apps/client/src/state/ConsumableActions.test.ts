import { describe, expect, it, vi } from "vitest";
import type { UseConsumableResult } from "../runtime/ConsumableRuntime";
import { ConsumableActions } from "./ConsumableActions";

function createHarness(result: UseConsumableResult) {
  const runtime = { useConsumable: vi.fn(() => result) };
  const bridge = {
    updatePlayerHealth: vi.fn(),
    addEconomyNotification: vi.fn(),
  };
  const syncConsumables = vi.fn();
  const syncInventory = vi.fn();
  const actions = new ConsumableActions({
    runtime,
    bridge: bridge as never,
    syncConsumables,
    syncInventory,
    now: () => 123,
  });

  return { actions, runtime, bridge, syncConsumables, syncInventory };
}

describe("ConsumableActions", () => {
  it("synchronizes consumables, health and inventory after successful use", () => {
    const harness = createHarness({
      ok: true,
      itemId: "item_health_potion",
      restored: 150,
      currentHealth: 400,
      maxHealth: 500,
    });

    expect(harness.actions.use("item_health_potion")).toBe(true);
    expect(harness.syncConsumables).toHaveBeenCalledOnce();
    expect(harness.bridge.updatePlayerHealth).toHaveBeenCalledWith(400, 500);
    expect(harness.syncInventory).toHaveBeenCalledOnce();
    expect(harness.bridge.addEconomyNotification).toHaveBeenCalledWith({
      id: "notif_consumable_123",
      type: "success",
      message: "Potion de soin : +150 PV",
      timestamp: 123,
    });
  });

  it.each([
    [
      { ok: false, reason: "hero_dead" } as const,
      "Action impossible : le héros est vaincu.",
    ],
    [
      { ok: false, reason: "resource_full" } as const,
      "Impossible à utiliser : points de vie déjà au maximum",
    ],
    [
      { ok: false, reason: "cooldown", remainingSeconds: 2.2 } as const,
      "Potion indisponible : 3 s",
    ],
  ])("preserves visible failure feedback", (result, expectedMessage) => {
    const harness = createHarness(result);

    expect(harness.actions.use("item_health_potion")).toBe(false);
    expect(harness.syncConsumables).not.toHaveBeenCalled();
    expect(harness.syncInventory).not.toHaveBeenCalled();
    expect(harness.bridge.addEconomyNotification).toHaveBeenCalledWith(
      expect.objectContaining({ type: "error", message: expectedMessage }),
    );
  });

  it.each(["not_in_inventory", "unknown_item"] as const)(
    "keeps silent runtime failures silent: %s",
    (reason) => {
      const harness = createHarness({ ok: false, reason });

      expect(harness.actions.use("unknown")).toBe(false);
      expect(harness.bridge.addEconomyNotification).not.toHaveBeenCalled();
    },
  );
});

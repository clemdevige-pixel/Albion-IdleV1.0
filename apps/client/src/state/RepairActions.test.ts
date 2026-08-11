import { describe, expect, it, vi } from "vitest";
import type { EntityId } from "@game/core";
import {
  asPlayerId,
  asWalletId,
  type EconomyTransactionResult,
} from "@game/gameplay";
import { RepairActions } from "./RepairActions";

function createHarness(result: EconomyTransactionResult) {
  const economyTransactionService = { execute: vi.fn(() => result) };
  const bridge = {
    addTransaction: vi.fn(),
    addEconomyNotification: vi.fn(),
  };
  const resyncAll = vi.fn();
  const actions = new RepairActions({
    economyTransactionService,
    bridge: bridge as never,
    playerId: asPlayerId("player_test"),
    heroId: 7 as EntityId,
    walletId: asWalletId("wallet_test"),
    resyncAll,
    now: () => 123,
    random: () => 0.456789,
  });

  return { actions, economyTransactionService, bridge, resyncAll };
}

describe("RepairActions", () => {
  it("executes bulk repair and synchronizes successful results", () => {
    const harness = createHarness({
      ok: true,
      replayed: false,
      record: {} as never,
      effects: {
        type: "bulk_equipment_repair",
        outcome: { totalCost: 70 } as never,
      },
    });

    expect(harness.actions.repairAll()).toBe(true);
    expect(harness.economyTransactionService.execute).toHaveBeenCalledWith({
      type: "bulk_equipment_repair",
      transactionId: "tx_repair_123_456789",
      playerId: "player_test",
      playerEntityId: 7,
      walletId: "wallet_test",
      stationId: "station_general",
    });
    expect(harness.bridge.addTransaction).toHaveBeenCalledWith(
      expect.objectContaining({ type: "repair", amount: 70, timestamp: 123 }),
    );
    expect(harness.bridge.addEconomyNotification).toHaveBeenCalledWith(
      expect.objectContaining({
        type: "success",
        message: "Équipement réparé · 70 Silver",
      }),
    );
    expect(harness.resyncAll).toHaveBeenCalledOnce();
  });

  it("preserves the dedicated nothing-to-repair message", () => {
    const harness = createHarness({
      ok: false,
      code: "repair_nothing_to_repair",
      record: null,
    });

    expect(harness.actions.repairAll()).toBe(false);
    expect(harness.bridge.addEconomyNotification).toHaveBeenCalledWith(
      expect.objectContaining({
        type: "error",
        message: "Aucun équipement à réparer",
      }),
    );
    expect(harness.bridge.addTransaction).not.toHaveBeenCalled();
    expect(harness.resyncAll).not.toHaveBeenCalled();
  });

  it("preserves authoritative repair failure details", () => {
    const harness = createHarness({
      ok: false,
      code: "repair_insufficient_silver",
      record: null,
    });

    expect(harness.actions.repairAll()).toBe(false);
    expect(harness.bridge.addEconomyNotification).toHaveBeenCalledWith(
      expect.objectContaining({
        type: "error",
        message: "Réparation impossible : insufficient_silver",
      }),
    );
    expect(harness.resyncAll).not.toHaveBeenCalled();
  });
});

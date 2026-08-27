import { describe, expect, it, vi } from "vitest";
import type { EntityId } from "@game/core";
import type { CurrencyService, InventoryManager, WalletId } from "@game/gameplay";
import { SerializationFailedError } from "@game/persistence";
import type { GameBridge } from "../game/GameBridge";
import type { RuntimePersistence } from "../runtime/RuntimePersistence";
import { SaveGameActions } from "./SaveGameActions";

vi.mock("../runtime/ProductionStorage", () => ({
  migrateLegacyProductionMaterials: vi.fn(),
}));

function createActions(load: () => void) {
  const addEconomyNotification = vi.fn();
  const setLoadFailed = vi.fn();
  const resetSilverBalance = vi.fn();
  const syncPlayerHealth = vi.fn();
  const resyncAll = vi.fn();

  const persistence = {
    hasSave: () => true,
    load,
    setLoadFailed,
    getLastLoadSource: () => "primary" as const,
    isLoadFailed: () => false,
  } as unknown as RuntimePersistence;
  const inventoryManager = {
    getTotalQuantity: () => 0,
    removeQuantity: () => ({ ok: true }),
    addQuantity: () => ({ ok: true }),
  } as unknown as InventoryManager;
  const currencyService = {
    getBalance: () => ({ ok: true, value: 123 }),
  } as unknown as CurrencyService;
  const bridge = { addEconomyNotification } as unknown as GameBridge;

  const actions = new SaveGameActions({
    bridge,
    persistence,
    inventoryManager,
    currencyService,
    walletId: "wallet" as WalletId,
    heroId: "hero" as EntityId,
    bankId: "bank" as EntityId,
    productionStorageId: "production" as EntityId,
    getCurrentTick: () => 0,
    resetSilverBalance,
    syncPlayerHealth,
    resyncAll,
  });

  return {
    actions,
    addEconomyNotification,
    setLoadFailed,
    resetSilverBalance,
    syncPlayerHealth,
    resyncAll,
  };
}

describe("SaveGameActions load persistence recovery", () => {
  it("keeps and resyncs loaded runtime state when the post-load LocalStorage write fails", () => {
    vi.spyOn(console, "error").mockImplementation(() => undefined);
    const deps = createActions(() => {
      throw new SerializationFailedError("quota exceeded");
    });

    expect(deps.actions.load()).toBe(true);
    expect(deps.setLoadFailed).toHaveBeenCalledWith(false);
    expect(deps.resetSilverBalance).toHaveBeenCalledWith(123);
    expect(deps.syncPlayerHealth).toHaveBeenCalledOnce();
    expect(deps.resyncAll).toHaveBeenCalledOnce();
    expect(deps.addEconomyNotification).toHaveBeenCalledWith(
      expect.objectContaining({ type: "error" }),
    );
  });

  it("still propagates genuine load failures before applying loaded state", () => {
    const deps = createActions(() => {
      throw new Error("invalid save");
    });

    expect(() => deps.actions.load()).toThrow("invalid save");
    expect(deps.setLoadFailed).not.toHaveBeenCalled();
    expect(deps.resetSilverBalance).not.toHaveBeenCalled();
    expect(deps.syncPlayerHealth).not.toHaveBeenCalled();
    expect(deps.resyncAll).not.toHaveBeenCalled();
  });
});

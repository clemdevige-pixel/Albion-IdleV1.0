import { describe, expect, it, vi } from "vitest";
import type { EntityId } from "@game/core";
import type { CurrencyService, InventoryManager, WalletId } from "@game/gameplay";
import { SerializationFailedError } from "@game/persistence";
import type { EconomyNotificationVM, GameBridge } from "../game/GameBridge";
import type { RuntimePersistence } from "../runtime/RuntimePersistence";
import { SaveGameActions } from "./SaveGameActions";

vi.mock("../runtime/ProductionStorage", () => ({
  migrateLegacyProductionMaterials: vi.fn(),
}));

function createActions(
  load: () => void,
  loadSource: "primary" | "backup" | "backup_unrestored" = "primary",
) {
  const addEconomyNotification = vi.fn<(notification: EconomyNotificationVM) => void>();
  const setLoadFailed = vi.fn();
  const prepareRuntimeForLoad = vi.fn();
  const resetSilverBalance = vi.fn();
  const syncPlayerHealth = vi.fn();
  const resyncAll = vi.fn();

  const persistence = {
    hasSave: () => true,
    load,
    setLoadFailed,
    getLastLoadSource: () => loadSource,
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
    heroId: 1 as EntityId,
    bankId: 2 as EntityId,
    productionStorageId: 3 as EntityId,
    getCurrentTick: () => 0,
    prepareRuntimeForLoad,
    resetSilverBalance,
    syncPlayerHealth,
    resyncAll,
  });

  return {
    actions,
    addEconomyNotification,
    setLoadFailed,
    prepareRuntimeForLoad,
    resetSilverBalance,
    syncPlayerHealth,
    resyncAll,
  };
}

describe("SaveGameActions load persistence recovery", () => {
  it("clears transient runtime state before loading persisted providers", () => {
    const load = vi.fn();
    const deps = createActions(load);

    expect(deps.actions.load()).toBe(true);
    expect(deps.prepareRuntimeForLoad).toHaveBeenCalledOnce();
    expect(load).toHaveBeenCalledOnce();
    expect(deps.prepareRuntimeForLoad.mock.invocationCallOrder[0]).toBeLessThan(
      load.mock.invocationCallOrder[0] ?? Number.MAX_SAFE_INTEGER,
    );
  });

  it("keeps loaded runtime state but locks saving when the post-load LocalStorage write fails", () => {
    vi.spyOn(console, "error").mockImplementation(() => undefined);
    const deps = createActions(() => {
      throw new SerializationFailedError("quota exceeded");
    });

    expect(deps.actions.load()).toBe(true);
    expect(deps.prepareRuntimeForLoad).toHaveBeenCalledOnce();
    expect(deps.setLoadFailed).toHaveBeenCalledWith(true);
    expect(deps.resetSilverBalance).toHaveBeenCalledWith(123);
    expect(deps.syncPlayerHealth).toHaveBeenCalledOnce();
    expect(deps.resyncAll).toHaveBeenCalledOnce();
    expect(deps.addEconomyNotification).toHaveBeenCalledOnce();
    const notification = deps.addEconomyNotification.mock.calls[0]?.[0];
    expect(notification?.type).toBe("error");
    expect(notification?.message).toContain("Auto-save is disabled");
  });

  it("locks saving when a valid backup loads but cannot be restored to primary", () => {
    const deps = createActions(() => undefined, "backup_unrestored");

    expect(deps.actions.load()).toBe(true);
    expect(deps.setLoadFailed).toHaveBeenCalledWith(true);
    expect(deps.resetSilverBalance).toHaveBeenCalledWith(123);
    expect(deps.resyncAll).toHaveBeenCalledOnce();
    expect(deps.addEconomyNotification).toHaveBeenCalledOnce();
    const notification = deps.addEconomyNotification.mock.calls[0]?.[0];
    expect(notification?.type).toBe("error");
    expect(notification?.message).toContain("Auto-save is disabled");
  });

  it("keeps saving enabled after a healthy primary load", () => {
    const deps = createActions(() => undefined, "primary");

    expect(deps.actions.load()).toBe(true);
    expect(deps.setLoadFailed).toHaveBeenCalledWith(false);
  });

  it("still propagates genuine load failures before applying loaded state", () => {
    const deps = createActions(() => {
      throw new Error("invalid save");
    });

    expect(() => deps.actions.load()).toThrow("invalid save");
    expect(deps.prepareRuntimeForLoad).toHaveBeenCalledOnce();
    expect(deps.setLoadFailed).not.toHaveBeenCalled();
    expect(deps.resetSilverBalance).not.toHaveBeenCalled();
    expect(deps.syncPlayerHealth).not.toHaveBeenCalled();
    expect(deps.resyncAll).not.toHaveBeenCalled();
  });
});

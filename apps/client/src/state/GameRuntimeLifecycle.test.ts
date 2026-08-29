import { afterEach, describe, expect, it, vi } from "vitest";
import {
  cancelDeferredRuntimeDisposal,
  createRuntimeVisibilityHandler,
  deferRuntimeDisposal,
  loadInitialRuntimeSave,
} from "./GameRuntimeLifecycle";

function createDependencies(options?: {
  readonly hasSave?: boolean;
  readonly loadResult?: boolean;
  readonly loadError?: Error;
}) {
  const addEconomyNotification = vi.fn();
  const setLoadFailed = vi.fn();
  const loadError = options?.loadError;
  const loadGame = loadError === undefined
    ? vi.fn(() => options?.loadResult ?? true)
    : vi.fn(() => { throw loadError; });

  return {
    services: {
      bridge: { addEconomyNotification },
      hasSave: vi.fn(() => options?.hasSave ?? true),
      loadGame,
    },
    persistence: { setLoadFailed },
    addEconomyNotification,
    setLoadFailed,
    loadGame,
  };
}

describe("initial runtime save loading", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("does not load when the slot is empty", () => {
    const deps = createDependencies({ hasSave: false });

    loadInitialRuntimeSave(deps.services, deps.persistence);

    expect(deps.loadGame).not.toHaveBeenCalled();
    expect(deps.setLoadFailed).not.toHaveBeenCalled();
  });

  it("loads an existing save without reporting an error", () => {
    const deps = createDependencies();

    loadInitialRuntimeSave(deps.services, deps.persistence);

    expect(deps.loadGame).toHaveBeenCalledOnce();
    expect(deps.setLoadFailed).not.toHaveBeenCalled();
    expect(deps.addEconomyNotification).not.toHaveBeenCalled();
  });

  it("disables saving when an existing save cannot be loaded", () => {
    vi.spyOn(console, "error").mockImplementation(() => undefined);
    const deps = createDependencies({ loadResult: false });

    loadInitialRuntimeSave(deps.services, deps.persistence);

    expect(deps.setLoadFailed).toHaveBeenCalledWith(true);
    expect(deps.addEconomyNotification).toHaveBeenCalledWith(
      expect.objectContaining({ type: "error" }),
    );
  });

  it("disables saving when loading throws", () => {
    vi.spyOn(console, "error").mockImplementation(() => undefined);
    const deps = createDependencies({ loadError: new Error("invalid save") });

    loadInitialRuntimeSave(deps.services, deps.persistence);

    expect(deps.setLoadFailed).toHaveBeenCalledWith(true);
    expect(deps.addEconomyNotification).toHaveBeenCalledWith(
      expect.objectContaining({ type: "error" }),
    );
  });
});

describe("runtime visibility reconciliation", () => {
  it("resolves the exact hidden window and refreshes presentation before save", () => {
    let visibilityState: DocumentVisibilityState = "visible";
    let now = 1_000;
    const stopRuntime = vi.fn();
    const startRuntime = vi.fn();
    const resolveBackgroundElapsed = vi.fn();
    const syncPresentation = vi.fn();
    const saveGame = vi.fn();
    const handleVisibilityChange = createRuntimeVisibilityHandler({
      getVisibilityState: () => visibilityState,
      now: () => now,
      stopRuntime,
      startRuntime,
      resolveBackgroundElapsed,
      syncPresentation,
      saveGame,
    });

    visibilityState = "hidden";
    handleVisibilityChange();
    now = 2_500;
    handleVisibilityChange();

    expect(stopRuntime).toHaveBeenCalledOnce();
    expect(resolveBackgroundElapsed).not.toHaveBeenCalled();
    expect(syncPresentation).not.toHaveBeenCalled();

    now = 6_000;
    visibilityState = "visible";
    handleVisibilityChange();

    expect(resolveBackgroundElapsed).toHaveBeenCalledOnce();
    expect(resolveBackgroundElapsed).toHaveBeenCalledWith(5_000);
    expect(syncPresentation).toHaveBeenCalledOnce();
    expect(saveGame).toHaveBeenCalledOnce();
    expect(startRuntime).toHaveBeenCalledOnce();

    const [resolveOrder] = resolveBackgroundElapsed.mock.invocationCallOrder;
    const [syncOrder] = syncPresentation.mock.invocationCallOrder;
    const [saveOrder] = saveGame.mock.invocationCallOrder;
    const [startOrder] = startRuntime.mock.invocationCallOrder;
    if (
      resolveOrder === undefined
      || syncOrder === undefined
      || saveOrder === undefined
      || startOrder === undefined
    ) {
      throw new Error("Expected visibility reconciliation calls to be recorded");
    }

    expect(resolveOrder).toBeLessThan(syncOrder);
    expect(syncOrder).toBeLessThan(saveOrder);
    expect(saveOrder).toBeLessThan(startOrder);
  });

  it("restarts the live runtime even when passive resolution throws", () => {
    let visibilityState: DocumentVisibilityState = "hidden";
    let now = 100;
    const startRuntime = vi.fn();
    const syncPresentation = vi.fn();
    const handleVisibilityChange = createRuntimeVisibilityHandler({
      getVisibilityState: () => visibilityState,
      now: () => now,
      stopRuntime: vi.fn(),
      startRuntime,
      resolveBackgroundElapsed: () => { throw new Error("background failed"); },
      syncPresentation,
      saveGame: vi.fn(),
    });

    handleVisibilityChange();
    now = 1_100;
    visibilityState = "visible";

    expect(() => handleVisibilityChange()).toThrow("background failed");
    expect(syncPresentation).not.toHaveBeenCalled();
    expect(startRuntime).toHaveBeenCalledOnce();
  });
});

describe("runtime disposal scheduling", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("keeps the runtime alive when StrictMode immediately remounts", () => {
    vi.useFakeTimers();
    const runtimeKey = {};
    const dispose = vi.fn();

    deferRuntimeDisposal(runtimeKey, dispose);
    cancelDeferredRuntimeDisposal(runtimeKey);
    vi.runAllTimers();

    expect(dispose).not.toHaveBeenCalled();
  });

  it("disposes the runtime after a real unmount", () => {
    vi.useFakeTimers();
    const runtimeKey = {};
    const dispose = vi.fn();

    deferRuntimeDisposal(runtimeKey, dispose);
    vi.runAllTimers();

    expect(dispose).toHaveBeenCalledTimes(1);
  });
});

import { afterEach, describe, expect, it, vi } from "vitest";
import { isRuntimePresentationSuppressed } from "../runtime/RuntimePresentationSuppression";
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
  it("replays missed ticks with only the final tick presented before sync and save", () => {
    let visibilityState: DocumentVisibilityState = "visible";
    let now = 1_000;
    const suppressionStates: boolean[] = [];
    const tickRuntime = vi.fn(() => {
      suppressionStates.push(isRuntimePresentationSuppressed());
    });
    const stopRuntime = vi.fn();
    const startRuntime = vi.fn();
    const syncPresentation = vi.fn();
    const saveGame = vi.fn();
    const handleVisibilityChange = createRuntimeVisibilityHandler({
      getVisibilityState: () => visibilityState,
      now: () => now,
      tickIntervalMs: 500,
      tickRuntime,
      stopRuntime,
      startRuntime,
      syncPresentation,
      saveGame,
    });

    visibilityState = "hidden";
    handleVisibilityChange();
    now = 2_500;
    handleVisibilityChange();

    expect(stopRuntime).toHaveBeenCalledOnce();
    expect(tickRuntime).not.toHaveBeenCalled();
    expect(syncPresentation).not.toHaveBeenCalled();

    now = 6_000;
    visibilityState = "visible";
    handleVisibilityChange();

    expect(tickRuntime).toHaveBeenCalledTimes(10);
    expect(suppressionStates).toEqual([
      true, true, true, true, true, true, true, true, true, false,
    ]);
    expect(syncPresentation).toHaveBeenCalledOnce();
    expect(saveGame).toHaveBeenCalledOnce();
    expect(startRuntime).toHaveBeenCalledOnce();

    const tickOrders = tickRuntime.mock.invocationCallOrder;
    const [syncOrder] = syncPresentation.mock.invocationCallOrder;
    const [saveOrder] = saveGame.mock.invocationCallOrder;
    const [startOrder] = startRuntime.mock.invocationCallOrder;
    const lastTickOrder = tickOrders.at(-1);
    if (
      lastTickOrder === undefined
      || syncOrder === undefined
      || saveOrder === undefined
      || startOrder === undefined
    ) {
      throw new Error("Expected visibility reconciliation calls to be recorded");
    }

    expect(lastTickOrder).toBeLessThan(syncOrder);
    expect(syncOrder).toBeLessThan(saveOrder);
    expect(saveOrder).toBeLessThan(startOrder);
  });

  it("carries sub-tick hidden time across visibility sessions", () => {
    let visibilityState: DocumentVisibilityState = "visible";
    let now = 0;
    const tickRuntime = vi.fn();
    const handleVisibilityChange = createRuntimeVisibilityHandler({
      getVisibilityState: () => visibilityState,
      now: () => now,
      tickIntervalMs: 500,
      tickRuntime,
      stopRuntime: vi.fn(),
      startRuntime: vi.fn(),
      syncPresentation: vi.fn(),
      saveGame: vi.fn(),
    });

    visibilityState = "hidden";
    handleVisibilityChange();
    now = 300;
    visibilityState = "visible";
    handleVisibilityChange();
    expect(tickRuntime).not.toHaveBeenCalled();

    now = 1_000;
    visibilityState = "hidden";
    handleVisibilityChange();
    now = 1_250;
    visibilityState = "visible";
    handleVisibilityChange();

    expect(tickRuntime).toHaveBeenCalledOnce();
  });

  it("restarts the live runtime even when catch-up throws", () => {
    let visibilityState: DocumentVisibilityState = "hidden";
    let now = 100;
    const startRuntime = vi.fn();
    const syncPresentation = vi.fn();
    const handleVisibilityChange = createRuntimeVisibilityHandler({
      getVisibilityState: () => visibilityState,
      now: () => now,
      tickIntervalMs: 500,
      tickRuntime: () => { throw new Error("catch-up failed"); },
      stopRuntime: vi.fn(),
      startRuntime,
      syncPresentation,
      saveGame: vi.fn(),
    });

    handleVisibilityChange();
    now = 1_100;
    visibilityState = "visible";

    expect(() => handleVisibilityChange()).toThrow("catch-up failed");
    expect(syncPresentation).not.toHaveBeenCalled();
    expect(startRuntime).toHaveBeenCalledOnce();
  });

  it("rejects invalid fixed-step intervals", () => {
    expect(() => createRuntimeVisibilityHandler({
      getVisibilityState: () => "visible",
      now: () => 0,
      tickIntervalMs: 0,
      tickRuntime: vi.fn(),
      stopRuntime: vi.fn(),
      startRuntime: vi.fn(),
      syncPresentation: vi.fn(),
      saveGame: vi.fn(),
    })).toThrow("Runtime tick interval must be a positive finite number");
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

import { afterEach, describe, expect, it, vi } from "vitest";
import {
  cancelDeferredRuntimeDisposal,
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

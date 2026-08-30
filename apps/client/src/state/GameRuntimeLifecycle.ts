import { useEffect, useRef } from "react";
import { RuntimeLifecycle } from "../runtime/RuntimeLifecycle";
import type { RuntimePersistence } from "../runtime/RuntimePersistence";
import { runDevSandboxPostLoadAdjustment } from "../runtime/devSandboxPostLoad.js";
import type { GameBridge } from "../game/GameBridge";
import type { GameServices } from "./GameServices";

interface GameRuntimeLifecycleHandle {
  readonly tick: () => void;
  readonly tickIntervalMs: number;
  readonly persistence: RuntimePersistence;
  readonly syncPresentation: () => void;
  readonly dispose: () => void;
}

interface InitialSaveServices {
  readonly bridge: Pick<GameBridge, "addEconomyNotification">;
  readonly hasSave: () => boolean;
  readonly loadGame: () => boolean;
}

interface InitialSavePersistence {
  readonly setLoadFailed: (failed: boolean) => void;
}

export interface RuntimeVisibilitySessionDependencies {
  readonly getVisibilityState: () => DocumentVisibilityState;
  readonly now: () => number;
  readonly stopRuntime: () => void;
  readonly startRuntime: () => void;
  readonly resolveBackgroundElapsed: (elapsedMs: number) => void;
  readonly syncPresentation: () => void;
  readonly saveGame: () => void;
}

const runtimeHandles = new WeakMap<GameBridge, GameRuntimeLifecycleHandle>();
const pendingRuntimeDisposals = new WeakMap<object, ReturnType<typeof setTimeout>>();

/**
 * React StrictMode immediately remounts effects in development. Deferring the
 * permanent runtime disposal lets that remount cancel destruction while a real
 * unmount still releases subscriptions and coordinators on the next task.
 */
export function deferRuntimeDisposal(
  runtimeKey: object,
  dispose: () => void,
): void {
  const previous = pendingRuntimeDisposals.get(runtimeKey);
  if (previous !== undefined) clearTimeout(previous);

  const timeout = setTimeout(() => {
    pendingRuntimeDisposals.delete(runtimeKey);
    dispose();
  }, 0);
  pendingRuntimeDisposals.set(runtimeKey, timeout);
}

export function cancelDeferredRuntimeDisposal(runtimeKey: object): void {
  const timeout = pendingRuntimeDisposals.get(runtimeKey);
  if (timeout === undefined) return;
  clearTimeout(timeout);
  pendingRuntimeDisposals.delete(runtimeKey);
}

export function registerGameRuntimeLifecycle(
  bridge: GameBridge,
  handle: GameRuntimeLifecycleHandle,
): void {
  runtimeHandles.set(bridge, handle);
}

/** Loads a runtime save before auto-save starts and locks saving on failure. */
export function loadInitialRuntimeSave(
  services: InitialSaveServices,
  persistence: InitialSavePersistence,
): void {
  try {
    if (!services.hasSave()) return;

    if (!services.loadGame()) {
      persistence.setLoadFailed(true);
      console.error("[Persistence] Auto-load failed: save slot existed but load returned false");
      services.bridge.addEconomyNotification({
        id: `notif_load_failed_${String(Date.now())}`,
        type: "error",
        message: "Save could not be loaded. Auto-save has been disabled.",
        timestamp: Date.now(),
      });
    }
  } catch (error) {
    persistence.setLoadFailed(true);
    console.error("[Persistence] Failed during initial save check or load:", error);
    services.bridge.addEconomyNotification({
      id: `notif_load_failed_${String(Date.now())}`,
      type: "error",
      message: "Save could not be loaded. Auto-save has been disabled.",
      timestamp: Date.now(),
    });
  }
}

/**
 * Creates the hidden/visible transition handler for one live browser session.
 * Live ticks stop while hidden so browser timer throttling cannot partially
 * advance the runtime. On resume, passive systems receive the exact monotonic
 * elapsed window once, presentation is resynchronized from authoritative state,
 * then the reconciled state is saved before the live fixed-step runtime restarts.
 */
export function createRuntimeVisibilityHandler(
  dependencies: RuntimeVisibilitySessionDependencies,
): () => void {
  let hiddenAt: number | undefined;

  return () => {
    if (dependencies.getVisibilityState() === "hidden") {
      if (hiddenAt !== undefined) return;
      hiddenAt = dependencies.now();
      dependencies.stopRuntime();
      return;
    }

    if (hiddenAt === undefined) return;
    const elapsedMs = Math.max(0, dependencies.now() - hiddenAt);
    hiddenAt = undefined;

    try {
      dependencies.resolveBackgroundElapsed(elapsedMs);
      dependencies.syncPresentation();
      dependencies.saveGame();
    } finally {
      dependencies.startRuntime();
    }
  };
}

/** Owns the browser lifecycle around an already assembled game runtime. */
export function useGameRuntimeLifecycle(services: GameServices): void {
  const loadedRuntimeRef = useRef<GameBridge | undefined>(undefined);

  useEffect(() => {
    const handle = runtimeHandles.get(services.bridge);
    if (handle === undefined) {
      throw new Error("Game runtime lifecycle was not registered");
    }
    cancelDeferredRuntimeDisposal(services.bridge);

    // Save restore remains authoritative first. Dev sandbox presets may then
    // intentionally override only their authored test fields before ticks start.
    if (loadedRuntimeRef.current !== services.bridge) {
      loadedRuntimeRef.current = services.bridge;
      loadInitialRuntimeSave(services, handle.persistence);
      runDevSandboxPostLoadAdjustment();
      handle.syncPresentation();
    }

    const lifecycle = new RuntimeLifecycle();
    const startRuntime = (): void => {
      lifecycle.start(handle.tick, handle.tickIntervalMs);
    };
    startRuntime();
    const stopAutosave = handle.persistence.startAutosave(() => services.saveGame());
    const handleVisibilityChange = createRuntimeVisibilityHandler({
      getVisibilityState: () => document.visibilityState,
      now: () => performance.now(),
      stopRuntime: () => { lifecycle.stop(); },
      startRuntime,
      resolveBackgroundElapsed: (elapsedMs) => {
        handle.persistence.resolveBackgroundElapsed(elapsedMs);
      },
      syncPresentation: handle.syncPresentation,
      saveGame: () => { services.saveGame(); },
    });
    document.addEventListener("visibilitychange", handleVisibilityChange);
    handleVisibilityChange();

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      lifecycle.stop();
      stopAutosave();
      deferRuntimeDisposal(services.bridge, handle.dispose);
    };
  }, [services]);
}

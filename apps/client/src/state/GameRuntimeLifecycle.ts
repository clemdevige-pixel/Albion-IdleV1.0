import { useEffect, useRef } from "react";
import { RuntimeLifecycle } from "../runtime/RuntimeLifecycle";
import type { RuntimePersistence } from "../runtime/RuntimePersistence";
import { runDevSandboxPostLoadAdjustment } from "../runtime/devSandboxPostLoad.js";
import { runWithRuntimePresentationSuppressed } from "../runtime/RuntimePresentationSuppression.js";
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
  readonly tickIntervalMs: number;
  readonly tickRuntime: () => void;
  readonly stopRuntime: () => void;
  readonly startRuntime: () => void;
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
 *
 * Browser timers are intentionally stopped while hidden because browsers may
 * throttle them unpredictably. A hidden tab is still an active game session,
 * though: when it becomes visible again we replay the exact number of missed
 * authoritative fixed-step runtime ticks.
 *
 * All but the final catch-up tick run with transient presentation suppressed.
 * The final missed tick runs normally so combat presentation is current before
 * one global resync and save. Offline SaveProvider resolution remains reserved
 * for real reloads and closed-page sessions during save loading.
 */
export function createRuntimeVisibilityHandler(
  dependencies: RuntimeVisibilitySessionDependencies,
): () => void {
  if (!Number.isFinite(dependencies.tickIntervalMs) || dependencies.tickIntervalMs <= 0) {
    throw new Error("Runtime tick interval must be a positive finite number");
  }

  let hiddenAt: number | undefined;
  let carryElapsedMs = 0;

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
      carryElapsedMs += elapsedMs;
      const missedTicks = Math.floor(carryElapsedMs / dependencies.tickIntervalMs);
      carryElapsedMs -= missedTicks * dependencies.tickIntervalMs;

      const suppressedTicks = Math.max(0, missedTicks - 1);
      runWithRuntimePresentationSuppressed(() => {
        for (let index = 0; index < suppressedTicks; index += 1) {
          dependencies.tickRuntime();
        }
      });
      if (missedTicks > 0) {
        dependencies.tickRuntime();
      }

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

    // Save restore remains authoritative first. Dev sandbox presets then adjust
    // only their authored state. Do not trigger a global presentation resync
    // here: restored combat presentation is reconciled by the normal runtime tick.
    if (loadedRuntimeRef.current !== services.bridge) {
      loadedRuntimeRef.current = services.bridge;
      loadInitialRuntimeSave(services, handle.persistence);
      runDevSandboxPostLoadAdjustment();
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
      tickIntervalMs: handle.tickIntervalMs,
      tickRuntime: handle.tick,
      stopRuntime: () => { lifecycle.stop(); },
      startRuntime,
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

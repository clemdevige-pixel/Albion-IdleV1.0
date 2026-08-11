import { useEffect, useRef } from "react";
import { RuntimeLifecycle } from "../runtime/RuntimeLifecycle";
import type { RuntimePersistence } from "../runtime/RuntimePersistence";
import type { GameBridge } from "../game/GameBridge";
import type { GameServices } from "./GameServices";

interface GameRuntimeLifecycleHandle {
  readonly tick: () => void;
  readonly tickIntervalMs: number;
  readonly persistence: RuntimePersistence;
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

const runtimeHandles = new WeakMap<GameBridge, GameRuntimeLifecycleHandle>();

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

/** Owns the browser lifecycle around an already assembled game runtime. */
export function useGameRuntimeLifecycle(services: GameServices): void {
  const loadedRuntimeRef = useRef<GameBridge | undefined>(undefined);

  useEffect(() => {
    const handle = runtimeHandles.get(services.bridge);
    if (handle === undefined) {
      throw new Error("Game runtime lifecycle was not registered");
    }

    const lifecycle = new RuntimeLifecycle();
    lifecycle.start(handle.tick, handle.tickIntervalMs);

    if (loadedRuntimeRef.current !== services.bridge) {
      loadedRuntimeRef.current = services.bridge;
      loadInitialRuntimeSave(services, handle.persistence);
    }

    const stopAutosave = handle.persistence.startAutosave(() => services.saveGame());

    return () => {
      lifecycle.stop();
      stopAutosave();
      handle.dispose();
    };
  }, [services]);
}

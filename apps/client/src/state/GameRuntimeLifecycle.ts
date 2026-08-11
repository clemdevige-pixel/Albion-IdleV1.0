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

const runtimeHandles = new WeakMap<GameBridge, GameRuntimeLifecycleHandle>();

export function registerGameRuntimeLifecycle(
  bridge: GameBridge,
  handle: GameRuntimeLifecycleHandle,
): void {
  runtimeHandles.set(bridge, handle);
}

/** Owns the browser lifecycle around an already assembled game runtime. */
export function useGameRuntimeLifecycle(services: GameServices): void {
  const initialLoadAttemptedRef = useRef(false);

  useEffect(() => {
    const handle = runtimeHandles.get(services.bridge);
    if (handle === undefined) {
      throw new Error("Game runtime lifecycle was not registered");
    }

    const lifecycle = new RuntimeLifecycle();
    lifecycle.start(handle.tick, handle.tickIntervalMs);

    if (!initialLoadAttemptedRef.current) {
      initialLoadAttemptedRef.current = true;
      try {
        if (services.hasSave()) {
          const success = services.loadGame();
          if (!success) {
            handle.persistence.setLoadFailed(true);
            console.error("[Persistence] Auto-load failed: save slot existed but load returned false");
          }
        }
      } catch (error) {
        handle.persistence.setLoadFailed(true);
        console.error("[Persistence] Failed during initial save check or load:", error);
      }
    }

    const stopAutosave = handle.persistence.startAutosave(() => services.saveGame());

    return () => {
      lifecycle.stop();
      stopAutosave();
      handle.dispose();
    };
  }, [services]);
}

import {
  createContext,
  useContext,
  useSyncExternalStore,
  type ReactNode,
} from "react";
import type { GameBridgeState } from "../game/GameBridge.js";
import type { GameServices } from "./GameServices.js";

const GameServiceContext = createContext<GameServices | null>(null);

export function GameServicesContextProvider({
  children,
  services,
}: {
  readonly children: ReactNode;
  readonly services: GameServices;
}): JSX.Element {
  return (
    <GameServiceContext.Provider value={services}>
      {children}
    </GameServiceContext.Provider>
  );
}

/** Access the stable application-service contract from a React component. */
export function useGameServices(): GameServices {
  const context = useContext(GameServiceContext);
  if (context === null) {
    throw new Error("useGameServices must be used within a GameProvider");
  }
  return context;
}

/** Subscribe to immutable bridge snapshots without exposing the composition root. */
export function useGameBridge(): GameBridgeState {
  const { bridge } = useGameServices();
  return useSyncExternalStore(bridge.subscribe, bridge.getSnapshot);
}

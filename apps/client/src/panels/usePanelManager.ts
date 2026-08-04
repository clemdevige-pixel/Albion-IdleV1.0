import { useContext } from "react";
import { PanelManagerContext, type PanelManagerState } from "./PanelManager";

/**
 * Hook to access the panel manager — tracks which panel is open and provides
 * open/close/toggle operations.
 */
export function usePanelManager(): PanelManagerState {
  const ctx = useContext(PanelManagerContext);
  if (ctx === null) {
    throw new Error("usePanelManager must be used within a PanelManagerProvider");
  }
  return ctx;
}

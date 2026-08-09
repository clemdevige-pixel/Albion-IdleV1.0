import { useMemo } from "react";
import { useNavigation } from "../ui/navigation";
import type { PanelManagerState } from "./PanelManager";

/** Compatibility hook for legacy panels. */
export function usePanelManager(): PanelManagerState {
  const navigation = useNavigation();

  return useMemo(
    () => ({
      activePanel: navigation.activeModule,
      openPanel: navigation.openModule,
      closePanel: navigation.returnToDashboard,
      togglePanel: navigation.toggleModule,
    }),
    [navigation],
  );
}

import type { ReactNode } from "react";
import { NavigationProvider } from "../ui/navigation";
import type { UiModuleId } from "../ui/navigation/moduleIds";

export interface PanelManagerState {
  /** Legacy panel API backed by the typed UI navigation state. */
  readonly activePanel: UiModuleId;
  readonly openPanel: (id: UiModuleId) => void;
  readonly closePanel: () => void;
  readonly togglePanel: (id: UiModuleId) => void;
}

/**
 * Compatibility provider for legacy panels. New UI code should use the
 * navigation API from ui/navigation directly.
 */
export function PanelManagerProvider({ children }: { readonly children: ReactNode }): JSX.Element {
  return <NavigationProvider>{children}</NavigationProvider>;
}

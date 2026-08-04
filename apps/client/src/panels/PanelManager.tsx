import { createContext, useCallback, useMemo, useState, type ReactNode } from "react";

export interface PanelManagerState {
  /** Currently active panel id, or null if none open. */
  readonly activePanel: string | null;
  readonly openPanel: (id: string) => void;
  readonly closePanel: () => void;
  readonly togglePanel: (id: string) => void;
}

export const PanelManagerContext = createContext<PanelManagerState | null>(null);

/**
 * Provider enforcing the single-panel policy — only one management panel
 * can be open at a time.
 */
export function PanelManagerProvider({ children }: { readonly children: ReactNode }): JSX.Element {
  const [activePanel, setActivePanel] = useState<string | null>(null);

  const openPanel = useCallback((id: string) => { setActivePanel(id); }, []);
  const closePanel = useCallback(() => { setActivePanel(null); }, []);
  const togglePanel = useCallback(
    (id: string) => { setActivePanel((prev) => (prev === id ? null : id)); },
    [],
  );

  const value = useMemo<PanelManagerState>(
    () => ({ activePanel, openPanel, closePanel, togglePanel }),
    [activePanel, openPanel, closePanel, togglePanel],
  );

  return (
    <PanelManagerContext.Provider value={value}>{children}</PanelManagerContext.Provider>
  );
}

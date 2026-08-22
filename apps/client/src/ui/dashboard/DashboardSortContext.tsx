import {
  createContext,
  useContext,
  type DragEvent,
  type KeyboardEvent,
  type ReactNode,
} from "react";
import type { DashboardSectionId } from "../../data/dashboardLayoutCatalog";

interface DashboardSortContextValue {
  readonly beginDrag: (event: DragEvent<HTMLElement>, sectionId: DashboardSectionId) => void;
  readonly endDrag: () => void;
  readonly handleKeyDown: (event: KeyboardEvent<HTMLElement>, sectionId: DashboardSectionId) => void;
}

const DashboardSortContext = createContext<DashboardSortContextValue | null>(null);

export function DashboardSortProvider({
  value,
  children,
}: {
  readonly value: DashboardSortContextValue;
  readonly children: ReactNode;
}): JSX.Element {
  return (
    <DashboardSortContext.Provider value={value}>
      {children}
    </DashboardSortContext.Provider>
  );
}

export function useDashboardSort(): DashboardSortContextValue | null {
  return useContext(DashboardSortContext);
}

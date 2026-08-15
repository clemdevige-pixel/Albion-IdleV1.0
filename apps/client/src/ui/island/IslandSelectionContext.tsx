import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";

interface IslandSelectionState {
  readonly selectedPlotId: string | null;
  readonly selectedBuildingInstanceId: string | null;
  readonly selectPlot: (plotId: string, buildingInstanceId?: string | null) => void;
  readonly selectBuilding: (plotId: string, buildingInstanceId: string) => void;
  readonly clearSelection: () => void;
}

const IslandSelectionContext = createContext<IslandSelectionState | null>(null);

export function IslandSelectionProvider({ children }: { readonly children: ReactNode }): JSX.Element {
  const [selectedPlotId, setSelectedPlotId] = useState<string | null>(null);
  const [selectedBuildingInstanceId, setSelectedBuildingInstanceId] = useState<string | null>(null);

  const selectPlot = useCallback((plotId: string, buildingInstanceId: string | null = null) => {
    setSelectedPlotId(plotId);
    setSelectedBuildingInstanceId(buildingInstanceId);
  }, []);

  const selectBuilding = useCallback((plotId: string, buildingInstanceId: string) => {
    setSelectedPlotId(plotId);
    setSelectedBuildingInstanceId(buildingInstanceId);
  }, []);

  const clearSelection = useCallback(() => {
    setSelectedPlotId(null);
    setSelectedBuildingInstanceId(null);
  }, []);

  const value = useMemo<IslandSelectionState>(() => ({
    selectedPlotId,
    selectedBuildingInstanceId,
    selectPlot,
    selectBuilding,
    clearSelection,
  }), [selectedPlotId, selectedBuildingInstanceId, selectPlot, selectBuilding, clearSelection]);

  return <IslandSelectionContext.Provider value={value}>{children}</IslandSelectionContext.Provider>;
}

export function useIslandSelection(): IslandSelectionState {
  const context = useContext(IslandSelectionContext);
  if (context === null) throw new Error("useIslandSelection must be used within IslandSelectionProvider");
  return context;
}

import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";

interface IslandSelectionState {
  readonly selectedPlotId: string | null;
  readonly selectedBuildingInstanceId: string | null;
  readonly movingBuildingInstanceId: string | null;
  readonly selectPlot: (plotId: string, buildingInstanceId?: string | null) => void;
  readonly selectBuilding: (plotId: string, buildingInstanceId: string) => void;
  readonly startMovingBuilding: (buildingInstanceId: string) => void;
  readonly cancelMovingBuilding: () => void;
  readonly clearSelection: () => void;
}

const IslandSelectionContext = createContext<IslandSelectionState | null>(null);

export function IslandSelectionProvider({ children }: { readonly children: ReactNode }): JSX.Element {
  const [selectedPlotId, setSelectedPlotId] = useState<string | null>(null);
  const [selectedBuildingInstanceId, setSelectedBuildingInstanceId] = useState<string | null>(null);
  const [movingBuildingInstanceId, setMovingBuildingInstanceId] = useState<string | null>(null);

  const selectPlot = useCallback((plotId: string, buildingInstanceId: string | null = null) => {
    setSelectedPlotId(plotId);
    setSelectedBuildingInstanceId(buildingInstanceId);
  }, []);

  const selectBuilding = useCallback((plotId: string, buildingInstanceId: string) => {
    setSelectedPlotId(plotId);
    setSelectedBuildingInstanceId(buildingInstanceId);
  }, []);

  const startMovingBuilding = useCallback((buildingInstanceId: string) => {
    setMovingBuildingInstanceId(buildingInstanceId);
  }, []);

  const cancelMovingBuilding = useCallback(() => {
    setMovingBuildingInstanceId(null);
  }, []);

  const clearSelection = useCallback(() => {
    setSelectedPlotId(null);
    setSelectedBuildingInstanceId(null);
    setMovingBuildingInstanceId(null);
  }, []);

  const value = useMemo<IslandSelectionState>(() => ({
    selectedPlotId,
    selectedBuildingInstanceId,
    movingBuildingInstanceId,
    selectPlot,
    selectBuilding,
    startMovingBuilding,
    cancelMovingBuilding,
    clearSelection,
  }), [
    selectedPlotId,
    selectedBuildingInstanceId,
    movingBuildingInstanceId,
    selectPlot,
    selectBuilding,
    startMovingBuilding,
    cancelMovingBuilding,
    clearSelection,
  ]);

  return <IslandSelectionContext.Provider value={value}>{children}</IslandSelectionContext.Provider>;
}

export function useIslandSelection(): IslandSelectionState {
  const context = useContext(IslandSelectionContext);
  if (context === null) throw new Error("useIslandSelection must be used within IslandSelectionProvider");
  return context;
}

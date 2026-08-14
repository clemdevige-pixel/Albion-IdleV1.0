import { useMemo } from "react";
import {
  PLAYER_ISLAND_CONFIG,
  getIslandBuildingDefinition,
  getIslandLevelDefinition,
} from "@game/data";
import { useGameBridge, useGameServices } from "../../state/GameContext";
import { useIslandSelection } from "./IslandSelectionContext";
import "./islandWorld.css";

export function IslandWorldRegion(): JSX.Element {
  const { island, workers } = useGameBridge();
  const { getIslandLevel } = useGameServices();
  const { selectedPlotId, selectedBuildingInstanceId, selectPlot, selectBuilding } = useIslandSelection();
  const islandLevel = getIslandLevel();
  const levelDefinition = getIslandLevelDefinition(islandLevel);

  const buildingByInstanceId = useMemo(
    () => new Map(island.buildings.map((building) => [building.instanceId, building] as const)),
    [island.buildings],
  );

  return (
    <main className="ui-shell__world ui-island-world" aria-label="Vue de l'île">
      <div className="ui-island-world__header">
        <div>
          <span>DOMAINE DU JOUEUR</span>
          <strong>Île niv. {String(islandLevel)} · {levelDefinition?.label ?? "Développement"}</strong>
        </div>
        <small>{String(island.buildings.length)} / {String(PLAYER_ISLAND_CONFIG.buildings.length)} bâtiments construits</small>
      </div>

      <div className="ui-island-world__surface">
        <div className="ui-island-world__plots">
          {PLAYER_ISLAND_CONFIG.plots.map((plotDefinition) => {
            const plot = island.plots.find((candidate) => candidate.id === plotDefinition.id);
            const building = plot?.buildingInstanceId === null || plot?.buildingInstanceId === undefined
              ? undefined
              : buildingByInstanceId.get(plot.buildingInstanceId);
            const definition = building === undefined ? undefined : getIslandBuildingDefinition(building.definitionId);
            const selected = building === undefined
              ? selectedPlotId === plotDefinition.id && selectedBuildingInstanceId === null
              : selectedBuildingInstanceId === building.instanceId;
            const worker = definition?.gatheringService === undefined
              ? undefined
              : workers.workers.find((candidate) => candidate.profession === definition.gatheringService?.workerProfession);

            return (
              <button
                key={plotDefinition.id}
                type="button"
                className={`ui-island-world__plot${building === undefined ? " is-empty" : ""}${selected ? " is-selected" : ""}`}
                style={{ gridColumn: plotDefinition.column, gridRow: plotDefinition.row }}
                onClick={() => {
                  if (building === undefined) selectPlot(plotDefinition.id);
                  else selectBuilding(plotDefinition.id, building.instanceId);
                }}
              >
                <span className="ui-island-world__plot-icon">{definition?.icon ?? "+"}</span>
                <strong>{definition?.label ?? "Emplacement libre"}</strong>
                <small>{building === undefined ? "Construire" : `Niv. ${String(building.level)}`}</small>
                {worker !== undefined && (
                  <span className={`ui-island-world__status is-${worker.state}`}>
                    {worker.state === "working" ? "Production" : worker.state === "paused" ? "Pause" : "Disponible"}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      <div className="ui-island-world__hint">
        Cliquez sur un bâtiment ou un emplacement libre pour afficher ses détails dans le panneau droit.
      </div>
    </main>
  );
}

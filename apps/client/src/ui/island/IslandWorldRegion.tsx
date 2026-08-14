import { useMemo } from "react";
import {
  PLAYER_ISLAND_CONFIG,
  getIslandBuildingDefinition,
  getIslandLevelDefinition,
} from "@game/data";
import { useGameBridge, useGameServices } from "../../state/GameContext";
import { useIslandSelection } from "./IslandSelectionContext";
import "./islandWorld.css";

const PLOT_POSITIONS = [
  [17, 25], [38, 18], [62, 19], [82, 28],
  [13, 50], [35, 43], [64, 43], [87, 52],
  [20, 74], [42, 68], [66, 70], [82, 78],
] as const;

export function IslandWorldRegion(): JSX.Element {
  const { island, workers } = useGameBridge();
  const { getIslandLevel } = useGameServices();
  const { selectedPlotId, selectedBuildingInstanceId, selectPlot, selectBuilding, clearSelection } = useIslandSelection();
  const islandLevel = getIslandLevel();
  const levelDefinition = getIslandLevelDefinition(islandLevel);

  const buildingByInstanceId = useMemo(
    () => new Map(island.buildings.map((building) => [building.instanceId, building] as const)),
    [island.buildings],
  );

  return (
    <main className="ui-shell__world ui-island-world" aria-label="Vue de l'île">
      <div className="ui-island-world__sky" aria-hidden="true" />
      <div className="ui-island-world__water" aria-hidden="true" />
      <div className="ui-island-world__header">
        <div>
          <span>DOMAINE DU JOUEUR</span>
          <strong>Île niv. {String(islandLevel)} · {levelDefinition?.label ?? "Développement"}</strong>
        </div>
        <button type="button" onClick={clearSelection}>Vue d'ensemble</button>
      </div>

      <div className="ui-island-world__surface">
        <div className="ui-island-world__island" aria-label="Domaine et bâtiments">
          <div className="ui-island-world__shore" aria-hidden="true" />
          <div className="ui-island-world__grass" aria-hidden="true" />
          <div className="ui-island-world__path path-a" aria-hidden="true" />
          <div className="ui-island-world__path path-b" aria-hidden="true" />
          <div className="ui-island-world__path path-c" aria-hidden="true" />
          <div className="ui-island-world__decor decor-tree-a" aria-hidden="true">♣</div>
          <div className="ui-island-world__decor decor-tree-b" aria-hidden="true">♣</div>
          <div className="ui-island-world__decor decor-rock" aria-hidden="true">◆</div>

          {PLAYER_ISLAND_CONFIG.plots.map((plotDefinition, index) => {
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
            const position = PLOT_POSITIONS[index] ?? [50, 50];

            return (
              <button
                key={plotDefinition.id}
                type="button"
                className={`ui-island-world__plot${building === undefined ? " is-empty" : " is-built"}${selected ? " is-selected" : ""}`}
                style={{ left: `${String(position[0])}%`, top: `${String(position[1])}%` }}
                onClick={() => {
                  if (building === undefined) selectPlot(plotDefinition.id);
                  else selectBuilding(plotDefinition.id, building.instanceId);
                }}
              >
                <span className="ui-island-world__plot-shadow" aria-hidden="true" />
                <span className="ui-island-world__building" aria-hidden="true">
                  <span className="ui-island-world__building-roof" />
                  <span className="ui-island-world__building-body">{definition?.icon ?? "+"}</span>
                </span>
                <span className="ui-island-world__label">
                  <strong>{definition?.label ?? "Emplacement libre"}</strong>
                  <small>{building === undefined ? "Construire" : `Niv. ${String(building.level)}`}</small>
                  {worker !== undefined && (
                    <em className={`ui-island-world__status is-${worker.state}`}>
                      {worker.state === "working" ? "● Production" : worker.state === "paused" ? "● Pause" : "● Disponible"}
                    </em>
                  )}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="ui-island-world__hint">
        <span>{String(island.buildings.length)} / {String(PLAYER_ISLAND_CONFIG.buildings.length)} bâtiments</span>
        <span>Cliquez sur un bâtiment ou un terrain libre pour gérer le domaine.</span>
      </div>
    </main>
  );
}

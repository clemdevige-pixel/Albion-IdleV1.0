import { useMemo, type CSSProperties } from "react";
import {
  PLAYER_ISLAND_CONFIG,
  getIslandBuildingDefinition,
  getIslandLevelDefinition,
  type IslandBuildingId,
} from "@game/data";
import { useGameBridge, useGameServices } from "../../state/GameContext";
import { useIslandSelection } from "./IslandSelectionContext";
import "./islandWorld.css";

interface IslandPlotVisual {
  readonly left: number;
  readonly top: number;
  readonly scale?: number;
}

interface BuildingAtlasVisual {
  readonly x: number;
  readonly y: number;
}

/** Positions are authored against island-background.webp (1600x900). */
const PLOT_VISUALS: readonly IslandPlotVisual[] = [
  { left: 23, top: 20, scale: 0.92 },
  { left: 47, top: 17, scale: 0.96 },
  { left: 69, top: 20, scale: 0.92 },
  { left: 84, top: 31, scale: 0.88 },
  { left: 16, top: 42, scale: 0.9 },
  { left: 38, top: 37, scale: 0.96 },
  { left: 59, top: 38, scale: 0.96 },
  { left: 80, top: 47, scale: 0.9 },
  { left: 20, top: 63, scale: 0.9 },
  { left: 42, top: 58, scale: 0.96 },
  { left: 62, top: 61, scale: 0.94 },
  { left: 78, top: 70, scale: 0.88 },
] as const;

/**
 * Atlas order follows the supplied 4x3 building board, after labels were removed
 * and every silhouette normalized into an equal 320x220 transparent cell.
 */
const BUILDING_ATLAS: Readonly<Record<IslandBuildingId | "constructible", BuildingAtlasVisual>> = {
  worker_house: { x: 0, y: 0 },
  storage: { x: 1, y: 0 },
  lumber_camp: { x: 2, y: 0 },
  mine: { x: 3, y: 0 },
  hunting_camp: { x: 0, y: 1 },
  fiber_camp: { x: 1, y: 1 },
  sawmill: { x: 2, y: 1 },
  weaver: { x: 3, y: 1 },
  smelter: { x: 0, y: 2 },
  tannery: { x: 1, y: 2 },
  workshop: { x: 2, y: 2 },
  constructible: { x: 3, y: 2 },
};

function atlasStyle(assetId: IslandBuildingId | "constructible", scale: number): CSSProperties {
  const atlas = BUILDING_ATLAS[assetId];
  return {
    "--island-atlas-x": `${String(atlas.x * 33.333333)}%`,
    "--island-atlas-y": `${String(atlas.y * 50)}%`,
    "--island-building-scale": String(scale),
  } as CSSProperties;
}

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
      <div className="ui-island-world__header">
        <div>
          <span>DOMAINE DU JOUEUR</span>
          <strong>Île niv. {String(islandLevel)} · {levelDefinition?.label ?? "Développement"}</strong>
        </div>
        <button type="button" onClick={clearSelection}>Vue d'ensemble</button>
      </div>

      <div className="ui-island-world__surface">
        <div className="ui-island-world__island" aria-label="Domaine et bâtiments">
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
            const position = PLOT_VISUALS[index] ?? { left: 50, top: 50, scale: 1 };
            const assetId = definition?.id ?? "constructible";
            const accessibleLabel = building === undefined
              ? `Emplacement constructible ${String(index + 1)}`
              : `${definition?.label ?? "Bâtiment"}, niveau ${String(building.level)}`;

            return (
              <button
                key={plotDefinition.id}
                type="button"
                aria-label={accessibleLabel}
                title={accessibleLabel}
                className={`ui-island-world__plot${building === undefined ? " is-empty" : " is-built"}${selected ? " is-selected" : ""}`}
                style={{
                  left: `${String(position.left)}%`,
                  top: `${String(position.top)}%`,
                  ...atlasStyle(assetId, position.scale ?? 1),
                }}
                onClick={() => {
                  if (building === undefined) selectPlot(plotDefinition.id);
                  else selectBuilding(plotDefinition.id, building.instanceId);
                }}
              >
                <span className="ui-island-world__asset" aria-hidden="true" />
                <span className="ui-island-world__hover-label" aria-hidden="true">
                  <strong>{definition?.label ?? "Emplacement constructible"}</strong>
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
        <span>Cliquez directement sur un atelier ou un emplacement pour gérer le domaine.</span>
      </div>
    </main>
  );
}

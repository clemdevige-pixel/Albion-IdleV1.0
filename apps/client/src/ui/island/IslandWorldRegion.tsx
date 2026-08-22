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
}

/**
 * Fixed bottom-center anchors measured against island_background.png.
 * They intentionally follow the visual 4x3 layout of the new island rather than
 * the logical row/column metadata: a building may be moved between plots without
 * changing its visual size or anchor contract.
 */
const PLOT_VISUALS: Readonly<Record<string, IslandPlotVisual>> = {
  plot_01: { left: 24.40, top: 34.22 },
  plot_02: { left: 41.03, top: 34.22 },
  plot_03: { left: 57.95, top: 34.22 },
  plot_04: { left: 75.42, top: 34.22 },
  plot_05: { left: 23.39, top: 51.54 },
  plot_06: { left: 40.85, top: 51.54 },
  plot_07: { left: 58.25, top: 51.54 },
  plot_08: { left: 74.64, top: 51.54 },
  plot_09: { left: 24.34, top: 69.08 },
  plot_10: { left: 41.45, top: 69.08 },
  plot_11: { left: 58.25, top: 69.08 },
  plot_12: { left: 75.78, top: 69.08 },
};

/**
 * Asset-specific normalization. Scale belongs to the building, never to the plot,
 * so the same building keeps the same footprint wherever the player constructs it.
 */
const BUILDING_VISUAL_SCALES: Readonly<Record<IslandBuildingId, number>> = {
  worker_house: 0.88,
  storage: 0.86,
  lumber_camp: 0.82,
  mine: 0.78,
  hunting_camp: 0.82,
  fiber_camp: 0.82,
  sawmill: 0.86,
  smelter: 0.84,
  tannery: 0.84,
  weaver: 0.84,
  workshop: 0.94,
  academy: 0.94,
};

const BUILDING_ASSET_PATHS: Readonly<Record<IslandBuildingId, string>> = {
  worker_house: "/assets/worker_house.png",
  storage: "/assets/storage.png",
  lumber_camp: "/assets/lumber_camp.png",
  mine: "/assets/mine.png",
  hunting_camp: "/assets/hunting_camp.png",
  fiber_camp: "/assets/fiber_camp.png",
  sawmill: "/assets/sawmill.png",
  smelter: "/assets/smelter.png",
  tannery: "/assets/tannery.png",
  weaver: "/assets/weaver.png",
  workshop: "/assets/workshop.png",
  academy: "/assets/academy.png",
};

function getPlotVisual(plotId: string): IslandPlotVisual {
  const visual = PLOT_VISUALS[plotId];
  if (visual === undefined) throw new Error(`Missing island visual anchor for ${plotId}`);
  return visual;
}

function assetStyle(assetId: IslandBuildingId | "constructible"): CSSProperties {
  if (assetId === "constructible") {
    return {
      "--island-building-image": "none",
      "--island-building-scale": "1",
    } as CSSProperties;
  }

  return {
    "--island-building-image": `url("${BUILDING_ASSET_PATHS[assetId]}")`,
    "--island-building-scale": String(BUILDING_VISUAL_SCALES[assetId]),
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
            const position = getPlotVisual(plotDefinition.id);
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
                style={{ left: `${String(position.left)}%`, top: `${String(position.top)}%`, ...assetStyle(assetId) }}
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

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

/** Fixed bottom-center anchors measured against the previous island-background.webp. */
const PLOT_VISUALS: Readonly<Record<string, IslandPlotVisual>> = {
  plot_01: { left: 28.2, top: 28.1 },
  plot_02: { left: 48.0, top: 25.3 },
  plot_03: { left: 70.8, top: 30.9 },
  plot_04: { left: 17.9, top: 43.7 },
  plot_05: { left: 37.9, top: 44.3 },
  plot_06: { left: 57.1, top: 41.8 },
  plot_07: { left: 81.8, top: 48.4 },
  plot_08: { left: 66.2, top: 59.6 },
  plot_09: { left: 19.8, top: 68.6 },
  plot_10: { left: 37.3, top: 74.6 },
  plot_11: { left: 55.9, top: 78.1 },
  plot_12: { left: 79.0, top: 75.9 },
};

/** Asset-specific normalization: scale belongs to the building, not to the plot. */
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

const CONSTRUCTIBLE_ASSET_PATH = "/assets/constructible.png";
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
      "--island-building-image": `url("${CONSTRUCTIBLE_ASSET_PATH}")`,
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

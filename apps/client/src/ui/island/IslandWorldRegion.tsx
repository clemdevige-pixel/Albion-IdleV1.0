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

/**
 * Plot anchors authored directly against island-background.webp (1600x900).
 * `top` is the visual ground/foot anchor of the building, not the parcel centre.
 */
const PLOT_VISUALS: readonly IslandPlotVisual[] = [
  { left: 25.0, top: 33.0, scale: 1.00 },
  { left: 48.0, top: 28.5, scale: 1.04 },
  { left: 71.5, top: 32.5, scale: 1.00 },
  { left: 86.0, top: 39.0, scale: 0.96 },
  { left: 18.0, top: 50.5, scale: 0.98 },
  { left: 40.5, top: 46.0, scale: 1.03 },
  { left: 61.5, top: 47.0, scale: 1.03 },
  { left: 81.5, top: 53.0, scale: 0.98 },
  { left: 21.0, top: 69.0, scale: 0.98 },
  { left: 42.5, top: 65.0, scale: 1.03 },
  { left: 63.5, top: 66.0, scale: 1.01 },
  { left: 79.5, top: 71.5, scale: 0.96 },
] as const;

const BUILDING_ASSET_PATHS: Readonly<Record<IslandBuildingId | "constructible", string>> = {
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
  constructible: "/assets/constructible.png",
};

function assetStyle(assetId: IslandBuildingId | "constructible", scale: number): CSSProperties {
  return {
    "--island-building-image": `url("${BUILDING_ASSET_PATHS[assetId]}")`,
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
                  ...assetStyle(assetId, position.scale ?? 1),
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

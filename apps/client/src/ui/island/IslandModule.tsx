import { useMemo, useState } from "react";
import { PLAYER_ISLAND_CONFIG, getIslandBuildingDefinition, type IslandBuildingId } from "@game/data";
import { useGameBridge } from "../../state/GameContext";
import { ConstructionPanel } from "./ConstructionPanel";
import { CraftingBuildingPanel } from "./CraftingBuildingPanel";
import { GatheringBuildingPanel } from "./GatheringBuildingPanel";
import { RefiningBuildingPanel } from "./RefiningBuildingPanel";
import { StoragePanel } from "./StoragePanel";
import { WorkerHousePanel } from "./WorkerHousePanel";
import "./island.css";

const CATEGORY_LABELS = {
  workers: "Ouvriers",
  gathering: "Récolte passive",
  refining: "Raffinage",
  crafting: "Fabrication",
  storage: "Stockage",
} as const;

export function IslandModule(): JSX.Element {
  const { island } = useGameBridge();
  const [selectedBuildingInstanceId, setSelectedBuildingInstanceId] = useState<string | null>(
    island.buildings[0]?.instanceId ?? null,
  );
  const [selectedPlotId, setSelectedPlotId] = useState<string | null>(
    island.buildings[0]?.plotId ?? null,
  );

  const buildingByInstanceId = useMemo(
    () => new Map(
      island.buildings.map((building) => [building.instanceId, building] as const),
    ),
    [island.buildings],
  );
  const builtDefinitionIds = useMemo(
    () => new Set(island.buildings.map((building) => building.definitionId)),
    [island.buildings],
  );
  const selectedBuilding = selectedBuildingInstanceId === null
    ? undefined
    : buildingByInstanceId.get(selectedBuildingInstanceId);
  const selectedDefinition = selectedBuilding === undefined
    ? undefined
    : getIslandBuildingDefinition(selectedBuilding.definitionId);

  return (
    <div className="ui-island">
      <section className="ui-island__intro">
        <div>
          <span className="ui-island__eyebrow">Hub économique permanent</span>
          <strong>Île du joueur</strong>
        </div>
        <span className="ui-island__count">{island.buildings.length} bâtiments</span>
      </section>

      <section className="ui-island__plots" aria-label="Implantation de l'île">
        {PLAYER_ISLAND_CONFIG.plots.map((plotDefinition) => {
          const plot = island.plots.find((candidate) => candidate.id === plotDefinition.id);
          const building = plot?.buildingInstanceId === null || plot?.buildingInstanceId === undefined
            ? undefined
            : buildingByInstanceId.get(plot.buildingInstanceId);
          const definition = building === undefined
            ? undefined
            : getIslandBuildingDefinition(building.definitionId);
          const selected = building === undefined
            ? selectedBuildingInstanceId === null && selectedPlotId === plotDefinition.id
            : selectedBuildingInstanceId === building.instanceId;

          return (
            <button
              key={plotDefinition.id}
              type="button"
              className={`ui-island__plot${building === undefined ? " is-empty" : ""}${selected ? " is-selected" : ""}`}
              style={{ gridColumn: plotDefinition.column, gridRow: plotDefinition.row }}
              onClick={() => {
                setSelectedPlotId(plotDefinition.id);
                setSelectedBuildingInstanceId(building?.instanceId ?? null);
              }}
            >
              {building === undefined || definition === undefined ? (
                <>
                  <span className="ui-island__plot-icon">＋</span>
                  <span>Emplacement</span>
                  <small>Construire</small>
                </>
              ) : (
                <>
                  <span className="ui-island__plot-icon">{definition.icon}</span>
                  <span>{definition.label}</span>
                  <small>Niveau {building.level}</small>
                </>
              )}
            </button>
          );
        })}
      </section>

      {selectedBuilding !== undefined && selectedDefinition !== undefined ? (
        <BuildingSummary definitionId={selectedDefinition.id} level={selectedBuilding.level} />
      ) : selectedPlotId !== null ? (
        <ConstructionPanel
          plotId={selectedPlotId}
          builtDefinitionIds={builtDefinitionIds}
          onBuilt={(definitionId) => {
            setSelectedBuildingInstanceId(`island_${definitionId}`);
          }}
        />
      ) : (
        <section className="ui-island__selection ui-island__selection--empty">
          <strong>Sélectionnez un emplacement</strong>
        </section>
      )}

      <section className="ui-island__catalog">
        <span className="ui-island__eyebrow">Infrastructure prévue</span>
        <div className="ui-island__catalog-grid">
          {PLAYER_ISLAND_CONFIG.buildings.map((definition) => (
            <div key={definition.id} className="ui-island__catalog-item">
              <span>{definition.icon}</span>
              <div>
                <strong>{definition.label}</strong>
                <small>{CATEGORY_LABELS[definition.category]}</small>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

function BuildingSummary({
  definitionId,
  level,
}: {
  readonly definitionId: IslandBuildingId;
  readonly level: number;
}): JSX.Element {
  const definition = getIslandBuildingDefinition(definitionId);

  return (
    <section className="ui-island__selection">
      <div className="ui-island__selection-heading">
        <span className="ui-island__selection-icon">{definition.icon}</span>
        <div>
          <span className="ui-island__eyebrow">{CATEGORY_LABELS[definition.category]}</span>
          <strong>{definition.label}</strong>
        </div>
        <span className="ui-island__level">Niv. {level}</span>
      </div>
      <p>{definition.description}</p>
      {definitionId === "worker_house" ? (
        <WorkerHousePanel level={level} />
      ) : definitionId === "storage" ? (
        <StoragePanel />
      ) : definition.gatheringService !== undefined ? (
        <GatheringBuildingPanel definitionId={definitionId} />
      ) : definition.refiningService !== undefined ? (
        <RefiningBuildingPanel definitionId={definitionId} />
      ) : definition.craftingService !== undefined ? (
        <CraftingBuildingPanel definitionId={definitionId} />
      ) : (
        <div className="ui-island__selection-status">
          Bâtiment construit · fonctionnalités à connecter dans les phases suivantes
        </div>
      )}
    </section>
  );
}

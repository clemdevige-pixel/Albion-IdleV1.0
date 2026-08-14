import { useMemo, useState } from "react";
import { PLAYER_ISLAND_CONFIG, getIslandBuildingDefinition, type IslandBuildingId } from "@game/data";
import { useGameBridge } from "../../state/GameContext";
import { ProductionModule } from "../production";
import "./island.css";

type IslandView = "island" | "production";

const CATEGORY_LABELS = {
  workers: "Ouvriers",
  gathering: "Récolte passive",
  refining: "Raffinage",
  crafting: "Fabrication",
  storage: "Stockage",
} as const;

export function IslandModule(): JSX.Element {
  const { island } = useGameBridge();
  const [view, setView] = useState<IslandView>("island");
  const [selectedBuildingInstanceId, setSelectedBuildingInstanceId] = useState<string | null>(
    island.buildings[0]?.instanceId ?? null,
  );

  const buildingByInstanceId = useMemo(
    () => new Map(island.buildings.map((building) => [building.instanceId, building])),
    [island.buildings],
  );
  const selectedBuilding = selectedBuildingInstanceId === null
    ? undefined
    : buildingByInstanceId.get(selectedBuildingInstanceId);
  const selectedDefinition = selectedBuilding === undefined
    ? undefined
    : getIslandBuildingDefinition(selectedBuilding.definitionId);

  if (view === "production") {
    return (
      <div className="ui-island">
        <IslandNavigation activeView={view} onChange={setView} />
        <div className="ui-island__transition-note">
          Interface Production conservée pendant la migration des activités vers les bâtiments de l'île.
        </div>
        <ProductionModule />
      </div>
    );
  }

  return (
    <div className="ui-island">
      <IslandNavigation activeView={view} onChange={setView} />

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

          return (
            <button
              key={plotDefinition.id}
              type="button"
              className={`ui-island__plot${building === undefined ? " is-empty" : ""}${selectedBuildingInstanceId === building?.instanceId ? " is-selected" : ""}`}
              style={{ gridColumn: plotDefinition.column, gridRow: plotDefinition.row }}
              onClick={() => { setSelectedBuildingInstanceId(building?.instanceId ?? null); }}
            >
              {building === undefined || definition === undefined ? (
                <>
                  <span className="ui-island__plot-icon">＋</span>
                  <span>Emplacement</span>
                  <small>Règle de placement à définir</small>
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
      ) : (
        <section className="ui-island__selection ui-island__selection--empty">
          <strong>Emplacement libre</strong>
          <p>La construction et les règles de plots seront ajoutées après validation de leur impact sur la progression.</p>
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

function IslandNavigation({
  activeView,
  onChange,
}: {
  readonly activeView: IslandView;
  readonly onChange: (view: IslandView) => void;
}): JSX.Element {
  return (
    <nav className="ui-island__tabs" aria-label="Sections de l'île">
      <button
        type="button"
        className={activeView === "island" ? "is-active" : ""}
        onClick={() => { onChange("island"); }}
      >
        Île
      </button>
      <button
        type="button"
        className={activeView === "production" ? "is-active" : ""}
        onClick={() => { onChange("production"); }}
      >
        Production actuelle
      </button>
    </nav>
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
      <div className="ui-island__selection-status">Fondation active · fonctionnalités du bâtiment à connecter dans les phases suivantes</div>
    </section>
  );
}

import { useMemo } from "react";
import {
  getIslandBuildingDefinition,
  getIslandLevelDefinition,
  type IslandBuildingId,
} from "@game/data";
import { useGameBridge, useGameServices } from "../../state/GameContext";
import { ConstructionPanel } from "./ConstructionPanel";
import { CraftingBuildingPanel } from "./CraftingBuildingPanel";
import { GatheringBuildingPanel } from "./GatheringBuildingPanel";
import { IslandBuildingProgressPanel } from "./IslandBuildingProgressPanel";
import { IslandLevelPanel } from "./IslandLevelPanel";
import { IslandOnboardingGuide } from "./IslandOnboardingGuide";
import { IslandWorkerOverviewPanel } from "./IslandWorkerOverviewPanel";
import { RefiningBuildingPanel } from "./RefiningBuildingPanel";
import { StoragePanel } from "./StoragePanel";
import { UpgradePanel } from "./UpgradePanel";
import { WorkerHousePanel } from "./WorkerHousePanel";
import { useIslandSelection } from "./IslandSelectionContext";
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
  const { getIslandLevel } = useGameServices();
  const islandLevel = getIslandLevel();
  const islandLevelDefinition = getIslandLevelDefinition(islandLevel);
  const {
    selectedPlotId,
    selectedBuildingInstanceId,
    selectBuilding,
    clearSelection,
  } = useIslandSelection();

  const buildingByInstanceId = useMemo(
    () => new Map(island.buildings.map((building) => [building.instanceId, building] as const)),
    [island.buildings],
  );
  const builtDefinitionIds = useMemo(
    () => new Set(island.buildings.map((building) => building.definitionId)),
    [island.buildings],
  );
  const selectedBuilding = selectedBuildingInstanceId === null
    ? undefined
    : buildingByInstanceId.get(selectedBuildingInstanceId);

  if (selectedBuilding !== undefined) {
    return (
      <div className="ui-island ui-island--detail">
        <IslandOverviewButton onClick={clearSelection} />
        <BuildingSummary definitionId={selectedBuilding.definitionId} level={selectedBuilding.level} />
      </div>
    );
  }

  if (selectedPlotId !== null) {
    return (
      <div className="ui-island ui-island--detail">
        <IslandOverviewButton onClick={clearSelection} />
        <ConstructionPanel
          plotId={selectedPlotId}
          islandLevel={islandLevel}
          builtDefinitionIds={builtDefinitionIds}
          onBuilt={(definitionId) => {
            selectBuilding(selectedPlotId, `island_${definitionId}`);
          }}
        />
      </div>
    );
  }

  return (
    <div className="ui-island ui-island--overview">
      <section className="ui-island__intro">
        <div>
          <span className="ui-island__eyebrow">Île du joueur</span>
          <strong>Niveau {String(islandLevel)} · {islandLevelDefinition?.label ?? "Développement"}</strong>
          <small>Développez vos bâtiments et vos filières de production.</small>
        </div>
        <span className="ui-island__count">{String(island.buildings.length)} bâtiments</span>
      </section>
      <IslandLevelPanel />
      <IslandWorkerOverviewPanel />
      <IslandBuildingProgressPanel />
      <IslandOnboardingGuide />
      <div className="ui-island__overview-hint">
        <span aria-hidden="true">◆</span>
        <span>Sélectionnez un bâtiment ou un emplacement libre sur l’île pour afficher sa gestion.</span>
      </div>
    </div>
  );
}

function IslandOverviewButton({ onClick }: { readonly onClick: () => void }): JSX.Element {
  return (
    <button type="button" className="ui-island__overview-button" onClick={onClick}>
      <span aria-hidden="true" className="ui-island__overview-button-icon">←</span>
      <strong>Vue d'ensemble de l'île</strong>
      <span aria-hidden="true" className="ui-island__overview-button-mark">◆</span>
    </button>
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
  const flatSelection = definitionId === "worker_house"
    || definitionId === "storage"
    || definition.gatheringService !== undefined
    || definition.refiningService !== undefined
    || definition.craftingService !== undefined;
  const selectionClassName = flatSelection
    ? "ui-island__selection ui-island__selection--flat"
    : "ui-island__selection";

  return (
    <section className={selectionClassName}>
      <div className="ui-island__selection-heading">
        <span className="ui-island__selection-icon">{definition.icon}</span>
        <div>
          <span className="ui-island__eyebrow">{CATEGORY_LABELS[definition.category]}</span>
          <strong>{definition.label}</strong>
        </div>
        <span className="ui-island__level">Niv. {String(level)}</span>
      </div>
      <p>{definition.description}</p>
      {definitionId === "worker_house" ? (
        <WorkerHousePanel level={level} />
      ) : definitionId === "storage" ? (
        <StoragePanel />
      ) : definition.gatheringService !== undefined ? (
        <GatheringBuildingPanel definitionId={definitionId} level={level} />
      ) : definition.refiningService !== undefined ? (
        <RefiningBuildingPanel definitionId={definitionId} level={level} />
      ) : definition.craftingService !== undefined ? (
        <CraftingBuildingPanel definitionId={definitionId} level={level} />
      ) : (
        <div className="ui-island__selection-status">Bâtiment construit</div>
      )}
      <UpgradePanel definitionId={definitionId} level={level} />
    </section>
  );
}

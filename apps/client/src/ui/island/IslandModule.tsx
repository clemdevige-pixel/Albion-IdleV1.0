import { useEffect, useMemo, useRef } from "react";
import {
  getIslandBuildingDefinition,
  getIslandLevelDefinition,
  getIslandMaxProductionTier,
  type IslandBuildingId,
} from "@game/data";
import { useGameBridge, useGameServices } from "../../state/GameContext";
import { FEATURE_UNLOCK_VISITS, useFeatureUnlockVisit } from "../attention/usePlayerAttention";
import { useNavigation } from "../navigation";
import { findWorkerGatheringBuilding } from "../shared/findWorkerGatheringBuilding";
import { AcademyPanel } from "./AcademyPanel";
import { ConstructionPanel } from "./ConstructionPanel";
import { CraftingBuildingPanel } from "./CraftingBuildingPanel";
import { GatheringBuildingPanel } from "./GatheringBuildingPanel";
import { IslandBuildingProgressPanel } from "./IslandBuildingProgressPanel";
import { IslandLevelPanel } from "./IslandLevelPanel";
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
  utility: "Utilitaire",
} as const;

export function IslandModule(): JSX.Element {
  const bridge = useGameBridge();
  const { island } = bridge;
  const { activeView } = useNavigation();
  const handledViewRef = useRef<string | null>(null);
  const { getIslandLevel } = useGameServices();
  const islandLevel = getIslandLevel();
  const islandLevelDefinition = getIslandLevelDefinition(islandLevel);
  const {
    selectedPlotId,
    selectedBuildingInstanceId,
    movingBuildingInstanceId,
    selectBuilding,
    startMovingBuilding,
    cancelMovingBuilding,
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
  const selectedBuildingDefinition = selectedBuilding === undefined
    ? undefined
    : getIslandBuildingDefinition(selectedBuilding.definitionId);

  useEffect(() => {
    if (activeView === null || handledViewRef.current === activeView) return;
    handledViewRef.current = activeView;

    let target = activeView === "academy_expeditions"
      ? island.buildings.find((building) => building.definitionId === "academy")
      : activeView === "worker_house"
        ? island.buildings.find((building) => building.definitionId === "worker_house")
        : activeView === "refining"
          ? island.buildings.find((building) => (
              getIslandBuildingDefinition(building.definitionId).refiningService !== undefined
            ))
          : undefined;

    if (activeView === "worker_attention") {
      const worker = bridge.workers.workers.find((candidate) => (
        candidate.state === "idle" || candidate.state === "paused"
      ));
      target = worker === undefined
        ? undefined
        : findWorkerGatheringBuilding(island.buildings, worker.profession);
      target ??= island.buildings.find((building) => building.definitionId === "worker_house");
    }

    if (target === undefined || selectedBuildingInstanceId === target.instanceId) return;
    selectBuilding(target.plotId, target.instanceId);
  }, [
    activeView,
    bridge.workers.workers,
    island.buildings,
    selectBuilding,
    selectedBuildingInstanceId,
  ]);

  useFeatureUnlockVisit(
    selectedBuilding?.definitionId === "worker_house"
      ? FEATURE_UNLOCK_VISITS.workerOrganization
      : selectedBuildingDefinition?.refiningService !== undefined
        ? FEATURE_UNLOCK_VISITS.instantRefining
        : [],
  );

  if (selectedBuilding !== undefined) {
    const moveActive = movingBuildingInstanceId === selectedBuilding.instanceId;
    const academyInitialView: "expeditions" | undefined = activeView === "academy_expeditions"
      ? "expeditions"
      : undefined;
    return (
      <div className="ui-island ui-island--detail">
        <IslandOverviewButton onClick={clearSelection} />
        <BuildingSummary
          definitionId={selectedBuilding.definitionId}
          level={selectedBuilding.level}
          islandLevel={islandLevel}
          moveActive={moveActive}
          onMove={() => {
            if (moveActive) cancelMovingBuilding();
            else startMovingBuilding(selectedBuilding.instanceId);
          }}
          {...(academyInitialView === undefined ? {} : { academyInitialView })}
        />
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
      <section className="ui-island__intro" aria-label="Résumé de l’île">
        <div>
          <strong>Niveau {String(islandLevel)} · {islandLevelDefinition?.label ?? "Développement"}</strong>
          <small>Développez vos bâtiments et vos filières de production.</small>
        </div>
        <span className="ui-island__count">{String(island.buildings.length)} bâtiments</span>
      </section>
      <IslandLevelPanel />
      <IslandWorkerOverviewPanel />
      <IslandBuildingProgressPanel />
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
  islandLevel,
  moveActive,
  onMove,
  academyInitialView,
}: {
  readonly definitionId: IslandBuildingId;
  readonly level: number;
  readonly islandLevel: number;
  readonly moveActive: boolean;
  readonly onMove: () => void;
  readonly academyInitialView?: "research" | "expeditions";
}): JSX.Element {
  const definition = getIslandBuildingDefinition(definitionId);
  const maxProductionTier = getIslandMaxProductionTier(islandLevel);
  const operational = definition.gatheringService !== undefined
    || definition.refiningService !== undefined
    || definition.craftingService !== undefined;
  const flatSelection = definitionId === "worker_house"
    || definitionId === "storage"
    || definitionId === "academy"
    || operational;
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
        <span className="ui-island__level">
          {operational && maxProductionTier !== undefined
            ? `Jusqu’au T${String(maxProductionTier)}`
            : `Niv. ${String(level)}`}
        </span>
      </div>
      <p>{definition.description}</p>
      <button type="button" className="ui-island__overview-button" onClick={onMove}>
        <span aria-hidden="true" className="ui-island__overview-button-icon">↔</span>
        <strong>{moveActive ? "Annuler le déplacement" : "Déplacer le bâtiment"}</strong>
        <span aria-hidden="true" className="ui-island__overview-button-mark">◆</span>
      </button>
      {definitionId === "worker_house" ? (
        <WorkerHousePanel level={level} />
      ) : definitionId === "storage" ? (
        <StoragePanel />
      ) : definitionId === "academy" ? (
        <AcademyPanel level={level} {...(academyInitialView === undefined ? {} : { initialView: academyInitialView })} />
      ) : definition.gatheringService !== undefined ? (
        <GatheringBuildingPanel definitionId={definitionId} islandLevel={islandLevel} />
      ) : definition.refiningService !== undefined ? (
        <RefiningBuildingPanel definitionId={definitionId} islandLevel={islandLevel} />
      ) : definition.craftingService !== undefined ? (
        <CraftingBuildingPanel definitionId={definitionId} islandLevel={islandLevel} />
      ) : (
        <div className="ui-island__selection-status">Bâtiment construit</div>
      )}
      <UpgradePanel definitionId={definitionId} level={level} />
    </section>
  );
}

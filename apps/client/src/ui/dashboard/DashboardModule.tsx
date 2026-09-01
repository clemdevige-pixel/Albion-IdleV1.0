import {
  useState,
  useSyncExternalStore,
  type DragEvent,
  type KeyboardEvent,
} from "react";
import "./dashboard.css";
import "./DashboardSortable.css";
import "./DashboardGroups.css";
import "./components/DashboardUtilityCards.css";
import {
  isDashboardSectionId,
  moveDashboardSection,
  type DashboardSectionId,
} from "../../data/dashboardLayoutCatalog";
import { dashboardLayoutSaveProvider } from "../../runtime/DashboardLayoutSaveProvider";
import { useGameServices } from "../../state/GameContext";
import { usePlayerAttention } from "../attention/usePlayerAttention";
import {
  useDashboardProduction,
  useDashboardYield,
  useDashboardZone,
  useDashboardZoneActions,
} from "./useDashboardData";
import { DashboardSortProvider } from "./DashboardSortContext";
import { DashboardAttentionCard } from "./components/DashboardAttentionCard";
import { DashboardCombatCard } from "./components/DashboardCombatCard";
import { DashboardEnchantReadyCard } from "./components/DashboardEnchantReadyCard";
import { DashboardProductionCard } from "./components/DashboardProductionCard";
import { DashboardResearchCard } from "./components/DashboardResearchCard";
import { DashboardYieldCard } from "./components/DashboardYieldCard";

const ACTIVITY_SECTION_IDS = new Set<DashboardSectionId>(["combat", "research", "production"]);
const YIELD_SECTION_IDS = new Set<DashboardSectionId>(["yield"]);

type DashboardGroupId = "activity" | "yield";

function getDashboardGroup(sectionId: DashboardSectionId): DashboardGroupId | undefined {
  if (ACTIVITY_SECTION_IDS.has(sectionId)) return "activity";
  if (YIELD_SECTION_IDS.has(sectionId)) return "yield";
  return undefined;
}

export function DashboardModule(): JSX.Element {
  const { saveGame, getAcademyModel } = useGameServices();
  const attention = usePlayerAttention();
  const zone = useDashboardZone();
  const zoneActions = useDashboardZoneActions();
  const production = useDashboardProduction();
  const yieldData = useDashboardYield();
  const academyModel = getAcademyModel();
  const hasResearchActivity = academyModel.research.some((entry) => entry.state === "active")
    || academyModel.expeditions.some((entry) => entry.active);
  const hasProductionActivity = production.tasks.length > 0 || production.gatheringInteraction !== undefined;
  const sectionOrder = useSyncExternalStore(
    dashboardLayoutSaveProvider.subscribe,
    dashboardLayoutSaveProvider.getOrder,
    dashboardLayoutSaveProvider.getOrder,
  );
  const [draggedSectionId, setDraggedSectionId] = useState<DashboardSectionId | null>(null);

  const sections: Partial<Readonly<Record<DashboardSectionId, JSX.Element | null>>> = {
    combat: (
      <DashboardCombatCard
        zone={zone}
        onSetFarmMode={zoneActions.setFarmMode}
      />
    ),
    research: hasResearchActivity ? <DashboardResearchCard /> : null,
    yield: <DashboardYieldCard yieldData={yieldData} />,
    production: hasProductionActivity ? <DashboardProductionCard production={production} /> : null,
  };

  const visibleOrder = sectionOrder.filter((sectionId) => {
    if (sectionId === "enchant-ready") return false;
    const section = sections[sectionId];
    return section !== undefined && section !== null;
  });
  const activityOrder = visibleOrder.filter((sectionId) => ACTIVITY_SECTION_IDS.has(sectionId));
  const yieldOrder = visibleOrder.filter((sectionId) => YIELD_SECTION_IDS.has(sectionId));
  const hasPriorities = attention.signals.length > 0;

  const persistOrder = (nextOrder: readonly DashboardSectionId[]): void => {
    dashboardLayoutSaveProvider.setOrder(nextOrder);
    saveGame();
  };

  const moveSection = (sourceId: DashboardSectionId, targetId: DashboardSectionId): void => {
    if (sourceId === targetId || getDashboardGroup(sourceId) !== getDashboardGroup(targetId)) return;
    persistOrder(moveDashboardSection(sectionOrder, sourceId, targetId));
  };

  const handleDragStart = (
    event: DragEvent<HTMLElement>,
    sectionId: DashboardSectionId,
  ): void => {
    setDraggedSectionId(sectionId);
    event.dataTransfer.effectAllowed = "move";
    event.dataTransfer.setData("text/plain", sectionId);
  };

  const handleDrop = (event: DragEvent<HTMLDivElement>, targetId: DashboardSectionId): void => {
    event.preventDefault();
    const transferredId = event.dataTransfer.getData("text/plain");
    const sourceId = draggedSectionId
      ?? (isDashboardSectionId(transferredId) ? transferredId : null);
    setDraggedSectionId(null);
    if (sourceId === null) return;
    moveSection(sourceId, targetId);
  };

  const handleHeaderKeyDown = (
    event: KeyboardEvent<HTMLElement>,
    sectionId: DashboardSectionId,
  ): void => {
    if (event.key !== "ArrowUp" && event.key !== "ArrowDown") return;
    const groupId = getDashboardGroup(sectionId);
    const groupOrder = groupId === "activity" ? activityOrder : groupId === "yield" ? yieldOrder : [];
    const visibleIndex = groupOrder.indexOf(sectionId);
    if (visibleIndex < 0) return;
    const targetIndex = event.key === "ArrowUp" ? visibleIndex - 1 : visibleIndex + 1;
    const targetId = groupOrder[targetIndex];
    if (targetId === undefined) return;
    event.preventDefault();
    moveSection(sectionId, targetId);
  };

  const renderSortableSection = (sectionId: DashboardSectionId): JSX.Element | null => {
    const section = sections[sectionId];
    if (section === undefined || section === null) return null;
    return (
      <div
        key={sectionId}
        className={`dashboard-sortable-section${draggedSectionId === sectionId ? " is-dragging" : ""}`}
        onDragOver={(event) => {
          event.preventDefault();
          event.dataTransfer.dropEffect = "move";
        }}
        onDrop={(event) => { handleDrop(event, sectionId); }}
      >
        {section}
      </div>
    );
  };

  return (
    <div className="dashboard-module">
      {hasPriorities && (
        <section className="dashboard-group dashboard-group--priorities" aria-labelledby="dashboard-priorities-title">
          <header className="dashboard-group__header">
            <div>
              <span>À surveiller</span>
              <h2 id="dashboard-priorities-title">Priorités</h2>
            </div>
          </header>
          <DashboardAttentionCard />
          <DashboardEnchantReadyCard />
        </section>
      )}

      <DashboardSortProvider
        value={{
          beginDrag: handleDragStart,
          endDrag: () => { setDraggedSectionId(null); },
          handleKeyDown: handleHeaderKeyDown,
        }}
      >
        {activityOrder.length > 0 && (
          <section className="dashboard-group" aria-labelledby="dashboard-activity-title">
            <header className="dashboard-group__header">
              <div>
                <span>Ce qui tourne</span>
                <h2 id="dashboard-activity-title">Activité en cours</h2>
              </div>
            </header>
            <div className="dashboard-group__content">
              {activityOrder.map(renderSortableSection)}
            </div>
          </section>
        )}

        {yieldOrder.length > 0 && (
          <section className="dashboard-group dashboard-group--passive" aria-labelledby="dashboard-yield-title">
            <header className="dashboard-group__header">
              <div>
                <span>Lecture passive</span>
                <h2 id="dashboard-yield-title">Rendement & suivi</h2>
              </div>
            </header>
            <div className="dashboard-group__content">
              {yieldOrder.map(renderSortableSection)}
            </div>
          </section>
        )}
      </DashboardSortProvider>
    </div>
  );
}

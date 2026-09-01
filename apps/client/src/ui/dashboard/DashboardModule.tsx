import {
  useState,
  useSyncExternalStore,
  type DragEvent,
  type KeyboardEvent,
} from "react";
import "./dashboard.css";
import "./DashboardSortable.css";
import "./components/DashboardUtilityCards.css";
import {
  isDashboardSectionId,
  moveDashboardSection,
  type DashboardSectionId,
} from "../../data/dashboardLayoutCatalog";
import { dashboardLayoutSaveProvider } from "../../runtime/DashboardLayoutSaveProvider";
import { useGameServices } from "../../state/GameContext";
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

export function DashboardModule(): JSX.Element {
  const { saveGame } = useGameServices();
  const zone = useDashboardZone();
  const zoneActions = useDashboardZoneActions();
  const production = useDashboardProduction();
  const yieldData = useDashboardYield();
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
    research: <DashboardResearchCard />,
    yield: <DashboardYieldCard yieldData={yieldData} />,
    production: <DashboardProductionCard production={production} />,
  };

  const visibleOrder = sectionOrder.filter((sectionId) => {
    if (sectionId === "enchant-ready") return false;
    const section = sections[sectionId];
    return section !== undefined && section !== null;
  });

  const persistOrder = (nextOrder: readonly DashboardSectionId[]): void => {
    dashboardLayoutSaveProvider.setOrder(nextOrder);
    saveGame();
  };

  const moveSection = (sourceId: DashboardSectionId, targetId: DashboardSectionId): void => {
    if (sourceId === targetId) return;
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
    const visibleIndex = visibleOrder.indexOf(sectionId);
    if (visibleIndex < 0) return;
    const targetIndex = event.key === "ArrowUp" ? visibleIndex - 1 : visibleIndex + 1;
    const targetId = visibleOrder[targetIndex];
    if (targetId === undefined) return;
    event.preventDefault();
    moveSection(sectionId, targetId);
  };

  return (
    <div className="dashboard-module">
      <DashboardAttentionCard />
      <DashboardEnchantReadyCard />

      <DashboardSortProvider
        value={{
          beginDrag: handleDragStart,
          endDrag: () => { setDraggedSectionId(null); },
          handleKeyDown: handleHeaderKeyDown,
        }}
      >
        {sectionOrder.map((sectionId) => {
          if (sectionId === "enchant-ready") return null;
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
        })}
      </DashboardSortProvider>
    </div>
  );
}

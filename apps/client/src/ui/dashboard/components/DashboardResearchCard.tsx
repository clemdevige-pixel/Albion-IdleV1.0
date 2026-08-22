import { useGameBridge, useGameServices } from "../../../state/GameContext";
import { useIslandSelection } from "../../island/IslandSelectionContext";
import { useNavigation } from "../../navigation";
import { UI_MODULE_IDS } from "../../navigation/moduleIds";
import { DashboardCard } from "./DashboardCard";
import "./DashboardResearchCard.css";

function formatRemainingDuration(durationMs: number): string {
  const totalSeconds = Math.max(0, Math.ceil(durationMs / 1000));
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  if (hours > 0) return `${String(hours)}h ${String(minutes).padStart(2, "0")}m`;
  if (minutes > 0) return `${String(minutes)}m ${String(seconds).padStart(2, "0")}s`;
  return `${String(seconds)}s`;
}

export function DashboardResearchCard(): JSX.Element | null {
  const bridge = useGameBridge();
  const { getAcademyModel } = useGameServices();
  const navigation = useNavigation();
  const islandSelection = useIslandSelection();
  const activeResearch = getAcademyModel().research.find((entry) => entry.state === "active");

  if (activeResearch === undefined || activeResearch.remainingDurationMs === undefined) return null;

  const elapsedMs = Math.max(0, activeResearch.durationMs - activeResearch.remainingDurationMs);
  const progress = activeResearch.durationMs <= 0
    ? 100
    : Math.max(0, Math.min(100, (elapsedMs / activeResearch.durationMs) * 100));
  const academy = bridge.island.buildings.find((building) => building.definitionId === "academy");

  const openAcademy = (): void => {
    if (academy === undefined) return;
    islandSelection.selectBuilding(academy.plotId, academy.instanceId);
    navigation.openModule(UI_MODULE_IDS.island);
  };

  return (
    <DashboardCard
      sectionId="research"
      meta={formatRemainingDuration(activeResearch.remainingDurationMs)}
    >
      <button
        type="button"
        className="dashboard-research__active"
        disabled={academy === undefined}
        onClick={openAcademy}
        title={academy === undefined ? undefined : "Ouvrir l’Académie"}
      >
        <div className="dashboard-research__summary">
          <div>
            <span>Recherche T{String(activeResearch.tier)}</span>
            <strong>{activeResearch.displayName}</strong>
            <small>Terminaison automatique à la fin du timer</small>
          </div>
          <b>{String(Math.round(progress))}%</b>
        </div>
        <div className="dashboard-progress" aria-label={`Progression ${String(Math.round(progress))}%`}>
          <span style={{ width: `${String(progress)}%` }} />
        </div>
      </button>
    </DashboardCard>
  );
}

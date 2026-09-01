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

function getProgress(durationMs: number | undefined, remainingDurationMs: number | undefined): number | undefined {
  if (durationMs === undefined || remainingDurationMs === undefined) return undefined;
  if (durationMs <= 0) return 100;
  return Math.max(0, Math.min(100, ((durationMs - remainingDurationMs) / durationMs) * 100));
}

export function DashboardResearchCard(): JSX.Element | null {
  const bridge = useGameBridge();
  const { getAcademyModel } = useGameServices();
  const navigation = useNavigation();
  const islandSelection = useIslandSelection();
  const academyModel = getAcademyModel();
  const activeResearch = academyModel.research.find((entry) => entry.state === "active");
  const activeExpeditions = academyModel.expeditions.filter((entry) => entry.active);

  if (activeResearch === undefined && activeExpeditions.length === 0) return null;

  const academy = bridge.island.buildings.find((building) => building.definitionId === "academy");
  const activityCount = (activeResearch === undefined ? 0 : 1) + activeExpeditions.length;

  const openAcademy = (): void => {
    if (academy === undefined) return;
    if (activeResearch === undefined && activeExpeditions.length > 0) {
      navigation.openModule(UI_MODULE_IDS.island, "academy_expeditions");
      return;
    }
    islandSelection.selectBuilding(academy.plotId, academy.instanceId);
    navigation.openModule(UI_MODULE_IDS.island);
  };

  const researchProgress = getProgress(activeResearch?.durationMs, activeResearch?.remainingDurationMs);

  return (
    <DashboardCard
      sectionId="research"
      meta={`${String(activityCount)} en cours`}
    >
      <button
        type="button"
        className="dashboard-research__active"
        disabled={academy === undefined}
        onClick={openAcademy}
        title={academy === undefined ? undefined : "Ouvrir l’Académie"}
      >
        {activeResearch !== undefined && (
          <div className="dashboard-research__activity">
            <div className="dashboard-research__summary">
              <div>
                <span>Recherche T{String(activeResearch.tier)}</span>
                <strong>{activeResearch.displayName}</strong>
              </div>
              <b>
                {activeResearch.remainingDurationMs === undefined
                  ? "En cours"
                  : formatRemainingDuration(activeResearch.remainingDurationMs)}
              </b>
            </div>
            {researchProgress !== undefined && (
              <div className="dashboard-progress" aria-label={`Progression ${String(Math.round(researchProgress))}%`}>
                <span style={{ width: `${String(researchProgress)}%` }} />
              </div>
            )}
          </div>
        )}

        {activeExpeditions.map((expedition) => {
          const progress = getProgress(expedition.activeDurationMs, expedition.remainingDurationMs);
          return (
            <div key={expedition.id} className="dashboard-research__activity dashboard-research__activity--expedition">
              <div className="dashboard-research__summary">
                <div>
                  <span>Expédition T{String(expedition.tier)} · Slot {String((expedition.activeSlotIndex ?? 0) + 1)}</span>
                  <strong>{expedition.displayName}</strong>
                </div>
                <b>
                  {expedition.remainingDurationMs === undefined
                    ? "En cours"
                    : formatRemainingDuration(expedition.remainingDurationMs)}
                </b>
              </div>
              {progress !== undefined && (
                <div className="dashboard-progress" aria-label={`Progression ${String(Math.round(progress))}%`}>
                  <span style={{ width: `${String(progress)}%` }} />
                </div>
              )}
            </div>
          );
        })}
      </button>
    </DashboardCard>
  );
}

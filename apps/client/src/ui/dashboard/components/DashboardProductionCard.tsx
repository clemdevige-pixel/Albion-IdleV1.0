import { ActiveGatheringGame } from "../../../hud/ActiveGatheringGame";
import type { DashboardProductionModel } from "../dashboardModels";
import { useDashboardGatheringActions } from "../useDashboardData";
import { DashboardCard } from "./DashboardCard";

interface DashboardProductionCardProps {
  readonly production: DashboardProductionModel;
}

const KIND_LABELS = {
  gathering: "Récolte",
  refining: "Raffinage",
  worker: "Worker",
} as const;

export function DashboardProductionCard({
  production,
}: DashboardProductionCardProps): JSX.Element {
  const actions = useDashboardGatheringActions();
  const interaction = production.gatheringInteraction;

  return (
    <DashboardCard
      title="Production"
      iconSrc="/assets/ui/nav-production.png"
      className="dashboard-card--production"
      meta={production.hiddenTaskCount > 0 ? `+${String(production.hiddenTaskCount)}` : undefined}
    >
      {production.tasks.length === 0 ? (
        <p className="dashboard-empty">Aucune production active.</p>
      ) : (
        <div className="dashboard-production__list">
          {production.tasks.map((task) => (
            <div key={task.id} className="dashboard-production__task">
              <span className={`dashboard-production__kind dashboard-production__kind--${task.kind}`} aria-hidden="true" />
              <div>
                <span>{KIND_LABELS[task.kind]}</span>
                <strong>{task.label}</strong>
                <small>{task.detail}</small>
              </div>
              <b><span>{String(Math.round(task.progress))}</span>%</b>
              <div className="dashboard-progress">
                <span style={{ width: `${String(Math.max(0, Math.min(100, task.progress)))}%` }} />
              </div>
            </div>
          ))}
        </div>
      )}
      {interaction !== undefined && (
        <div className="dashboard-production__gathering-controls">
          <ActiveGatheringGame
            cycleId={interaction.cycleId}
            strikesUsed={interaction.strikesUsed}
            durationSeconds={interaction.durationSeconds}
            onStrike={(quality) => actions.strike(interaction.resourceFamily, quality)}
          />
          <button type="button" onClick={actions.returnToCombat}>
            Retour au combat
          </button>
        </div>
      )}
    </DashboardCard>
  );
}

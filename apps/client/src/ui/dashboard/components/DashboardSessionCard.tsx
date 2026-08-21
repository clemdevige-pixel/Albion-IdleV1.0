import { formatCompactNumber, formatDuration } from "../../shared";
import type { DashboardSessionModel } from "../dashboardModels";
import { DashboardCard } from "./DashboardCard";

interface DashboardSessionCardProps {
  readonly session: DashboardSessionModel;
}

export function DashboardSessionCard({ session }: DashboardSessionCardProps): JSX.Element {
  return (
    <DashboardCard sectionId="session">
      <dl className="dashboard-session">
        <div className="dashboard-session__metric dashboard-session__metric--time"><dt>Temps de zone</dt><dd>{formatDuration(session.elapsedSeconds)}</dd></div>
        <div className="dashboard-session__metric dashboard-session__metric--kills"><dt>Ennemis vaincus</dt><dd>{String(session.enemiesKilled)}</dd></div>
        <div className="dashboard-session__metric dashboard-session__metric--silver"><dt>Silver / heure</dt><dd>{formatCompactNumber(session.silverPerHour)}</dd></div>
        <div className="dashboard-session__metric dashboard-session__metric--fame"><dt>Fame / heure</dt><dd>{formatCompactNumber(session.famePerHour)}</dd></div>
      </dl>
    </DashboardCard>
  );
}

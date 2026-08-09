import { formatSignedNumber } from "../../shared";
import type { DashboardActivityEntry } from "../dashboardModels";
import { DashboardCard } from "./DashboardCard";

interface DashboardActivityCardProps {
  readonly entries: readonly DashboardActivityEntry[];
}

function formatActivityTime(timestamp: number): string {
  return new Intl.DateTimeFormat("fr-FR", {
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(timestamp));
}

export function DashboardActivityCard({ entries }: DashboardActivityCardProps): JSX.Element {
  return (
    <DashboardCard
      title="Activité récente"
      iconSrc="/assets/ui/nav-inventory.png"
      className="dashboard-card--activity"
      meta={entries.length > 0 ? `${String(entries.length)} événements` : undefined}
    >
      {entries.length === 0 ? (
        <p className="dashboard-empty">Aucune activité fiable enregistrée.</p>
      ) : (
        <ul className="dashboard-activity">
          {entries.map((entry) => (
            <li key={entry.id} className={`dashboard-activity--${entry.type}`}>
              <time dateTime={new Date(entry.timestamp).toISOString()}>
                {formatActivityTime(entry.timestamp)}
              </time>
              <span><i aria-hidden="true" />{entry.description}</span>
              <strong>{formatSignedNumber(entry.amount)}</strong>
            </li>
          ))}
        </ul>
      )}
    </DashboardCard>
  );
}

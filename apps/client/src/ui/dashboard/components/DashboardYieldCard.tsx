import { formatCompactNumber } from "../../shared";
import type { DashboardYieldModel } from "../dashboardModels";
import { DashboardCard } from "./DashboardCard";
import "./DashboardYieldCard.css";

interface DashboardYieldCardProps {
  readonly yieldData: DashboardYieldModel;
}

const YIELD_METRICS = [
  { id: "silver", label: "Silver / heure", field: "silverPerHour" },
  { id: "fame", label: "Fame / heure", field: "famePerHour" },
  { id: "enchantment-shard", label: "Éclats d’enchant. / h", field: "enchantmentShardsPerHour" },
  { id: "key-fragment", label: "Fragments de clef / h", field: "keyFragmentsPerHour" },
] as const satisfies readonly {
  readonly id: string;
  readonly label: string;
  readonly field: keyof DashboardYieldModel;
}[];

export function DashboardYieldCard({ yieldData }: DashboardYieldCardProps): JSX.Element {
  return (
    <DashboardCard
      title="Rendement"
      iconSrc="/assets/ui/nav-masteries.png"
      className="dashboard-card--yield"
    >
      <dl className="dashboard-yield">
        {YIELD_METRICS.map((metric) => (
          <div key={metric.id} className={`dashboard-yield__metric dashboard-yield__metric--${metric.id}`}>
            <dt>{metric.label}</dt>
            <dd>{formatCompactNumber(yieldData[metric.field])}</dd>
          </div>
        ))}
      </dl>
    </DashboardCard>
  );
}

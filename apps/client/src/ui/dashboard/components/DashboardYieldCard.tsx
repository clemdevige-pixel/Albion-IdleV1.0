import { formatCompactNumber } from "../../shared";
import { ItemVisual } from "../../../panels/ItemVisual";
import { RESEARCH_IDS } from "../../../data/researchContentCatalog.js";
import { useGameBridge, useGameServices } from "../../../state/GameContext";
import type { DashboardYieldModel } from "../dashboardModels";
import { useResourceTracking } from "../ResourceTrackingContext";
import { resolveDashboardItemYieldPerHour } from "../resourceYieldProjection.js";
import { DashboardCard } from "./DashboardCard";
import "./DashboardYieldCard.css";

interface DashboardYieldCardProps {
  readonly yieldData: DashboardYieldModel;
}

const BASE_YIELD_METRICS = [
  { id: "silver", label: "Silver / heure", field: "silverPerHour" },
  { id: "fame", label: "Fame / heure", field: "famePerHour" },
] as const satisfies readonly {
  readonly id: string;
  readonly label: string;
  readonly field: keyof DashboardYieldModel;
}[];

export function DashboardYieldCard({ yieldData }: DashboardYieldCardProps): JSX.Element {
  const state = useGameBridge();
  const services = useGameServices();
  const tracking = useResourceTracking();
  const trackingUnlocked = services.getAcademyModel().research.some(
    (research) => research.id === RESEARCH_IDS.yieldAnalysis && research.state === "completed",
  );
  const tracked = trackingUnlocked ? tracking.selectedResource : undefined;
  const trackedEntry = tracked?.entries[0];
  const itemYieldPerHour = trackedEntry === undefined
    ? 0
    : resolveDashboardItemYieldPerHour(state)[trackedEntry.itemId] ?? 0;
  const trackedStock = trackedEntry === undefined
    ? 0
    : services.inventoryManager.getTotalQuantity(services.heroId, trackedEntry.itemId)
      + services.inventoryManager.getTotalQuantity(services.bankId, trackedEntry.itemId)
      + services.inventoryManager.getTotalQuantity(services.productionStorageId, trackedEntry.itemId);

  return (
    <DashboardCard sectionId="yield">
      <dl className="dashboard-yield">
        {BASE_YIELD_METRICS.map((metric) => (
          <div key={metric.id} className={`dashboard-yield__metric dashboard-yield__metric--${metric.id}`}>
            <dt>{metric.label}</dt>
            <dd>{formatCompactNumber(yieldData[metric.field])}</dd>
          </div>
        ))}
        {tracked !== undefined && trackedEntry !== undefined && (
          <div className="dashboard-yield__metric dashboard-yield__metric--tracked-resource">
            <dt>
              <span className="dashboard-yield__tracked-visual" aria-hidden="true">
                <ItemVisual itemId={trackedEntry.itemId} />
              </span>
              {tracked.label}
            </dt>
            <dd>
              <span>{formatCompactNumber(itemYieldPerHour)} / h</span>
              <small>Stock {formatCompactNumber(trackedStock)}</small>
            </dd>
          </div>
        )}
      </dl>
    </DashboardCard>
  );
}

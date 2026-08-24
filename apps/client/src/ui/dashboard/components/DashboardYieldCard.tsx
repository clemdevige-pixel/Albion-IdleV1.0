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
  const projectedItemYield = trackingUnlocked
    ? resolveDashboardItemYieldPerHour(state)
    : {};

  const trackedRows = trackingUnlocked
    ? tracking.resources.flatMap((resource) => {
        const entry = resource.entries[0];
        if (entry === undefined) return [];
        const projectedRate = projectedItemYield[entry.itemId] ?? 0;
        const yieldPerHour = isDungeonDiscoveryGatedItem(entry.itemId)
          && !services.isDungeonSystemUnlocked()
          ? 0
          : projectedRate;
        const stock = services.inventoryManager.getTotalQuantity(services.heroId, entry.itemId)
          + services.inventoryManager.getTotalQuantity(services.bankId, entry.itemId)
          + services.inventoryManager.getTotalQuantity(services.productionStorageId, entry.itemId);
        return [{ resource, entry, yieldPerHour, stock }];
      })
    : [];

  return (
    <DashboardCard sectionId="yield">
      <dl className="dashboard-yield">
        {BASE_YIELD_METRICS.map((metric) => (
          <div key={metric.id} className={`dashboard-yield__metric dashboard-yield__metric--${metric.id}`}>
            <dt>{metric.label}</dt>
            <dd>{formatCompactNumber(yieldData[metric.field])}</dd>
          </div>
        ))}
      </dl>

      {trackedRows.length > 0 && (
        <div className="dashboard-yield__tracked-list" aria-label="Ressources suivies">
          {trackedRows.map(({ resource, entry, yieldPerHour, stock }) => (
            <div key={resource.id} className="dashboard-yield__tracked-row">
              <div className="dashboard-yield__tracked-resource">
                <span className="dashboard-yield__tracked-visual" aria-hidden="true">
                  <ItemVisual itemId={entry.itemId} />
                </span>
                <div className="dashboard-yield__tracked-copy">
                  <strong>{resource.label}</strong>
                  <small>Stock {formatCompactNumber(stock)}</small>
                </div>
              </div>
              <div className="dashboard-yield__tracked-actions">
                <b>{formatCompactNumber(yieldPerHour)} / h</b>
                <button
                  type="button"
                  className="dashboard-yield__untrack"
                  aria-label={`Ne plus suivre ${resource.label}`}
                  title="Ne plus suivre"
                  onClick={() => { tracking.untrack(resource.id); }}
                >
                  ×
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </DashboardCard>
  );
}

function isDungeonDiscoveryGatedItem(itemId: string): boolean {
  return itemId.startsWith("item_resource_dungeon_key_")
    || itemId.startsWith("item_resource_key_fragment_")
    || itemId.startsWith("item_resource_rune_faction_");
}

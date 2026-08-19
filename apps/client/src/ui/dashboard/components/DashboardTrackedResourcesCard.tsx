import { ItemVisual } from "../../../panels/ItemVisual";
import { useGameBridge, useGameServices } from "../../../state/GameContext";
import { useResourceTracking, type TrackedResourceEntry } from "../ResourceTrackingContext";
import { DashboardCard } from "./DashboardCard";

export function DashboardTrackedResourcesCard(): JSX.Element | null {
  useGameBridge();
  const { inventoryManager, productionStorageId, heroId, bankId } = useGameServices();
  const tracking = useResourceTracking();

  if (tracking.resources.length === 0) return null;

  const getQuantity = (entry: TrackedResourceEntry): number => {
    if (entry.source === "production") {
      return inventoryManager.getTotalQuantity(productionStorageId, entry.itemId);
    }
    return inventoryManager.getTotalQuantity(heroId, entry.itemId)
      + inventoryManager.getTotalQuantity(bankId, entry.itemId);
  };

  return (
    <DashboardCard
      title="Ressources suivies"
      iconSrc="/assets/ui/nav-production.png"
      className="dashboard-card--tracked-resources"
    >
      <div className="dashboard-production__list">
        {tracking.resources.map((resource) => {
          const firstEntry = resource.entries[0];
          if (firstEntry === undefined) return null;
          return (
            <div key={resource.id} className="dashboard-production__task">
              <span className="dashboard-production__visual" aria-hidden="true">
                <ItemVisual itemId={firstEntry.itemId} />
              </span>
              <div>
                <span>Stock</span>
                <strong>{resource.label}</strong>
                {resource.entries.length > 1 && (
                  <small>
                    {resource.entries.map((entry) => `${entry.label}: ${String(getQuantity(entry))}`).join(" · ")}
                  </small>
                )}
              </div>
              {resource.entries.length === 1 && <b>{String(getQuantity(firstEntry))}</b>}
              <button
                type="button"
                aria-label={`Ne plus suivre ${resource.label}`}
                title="Ne plus suivre"
                onClick={() => { tracking.untrack(resource.id); }}
              >
                ×
              </button>
            </div>
          );
        })}
      </div>
    </DashboardCard>
  );
}

import { isProductionMaterial } from "../../../runtime/ProductionStorage";
import { useGameBridge, useGameServices } from "../../../state/GameContext";
import { useResourceTracking } from "../ResourceTrackingContext";
import { DashboardCard } from "./DashboardCard";

export function DashboardTrackedResourcesCard(): JSX.Element | null {
  // The bridge subscription keeps authoritative inventory-derived quantities fresh.
  useGameBridge();
  const { inventoryManager, productionStorageId, heroId } = useGameServices();
  const tracking = useResourceTracking();

  if (tracking.resources.length === 0) return null;

  return (
    <DashboardCard
      title="Ressources suivies"
      iconSrc="/assets/ui/nav-production.png"
      className="dashboard-card--tracked-resources"
    >
      <div className="dashboard-production__list">
        {tracking.resources.map((resource) => {
          const ownerId = isProductionMaterial(resource.itemId) ? productionStorageId : heroId;
          const quantity = inventoryManager.getTotalQuantity(ownerId, resource.itemId);
          return (
            <div key={resource.itemId} className="dashboard-production__task">
              <span className="dashboard-production__visual" aria-hidden="true">
                <img src={resource.iconSrc} alt="" />
              </span>
              <div>
                <span>Stock</span>
                <strong>{resource.label}</strong>
              </div>
              <b>{String(quantity)}</b>
              <button
                type="button"
                aria-label={`Ne plus suivre ${resource.label}`}
                title="Ne plus suivre"
                onClick={() => { tracking.untrack(resource.itemId); }}
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

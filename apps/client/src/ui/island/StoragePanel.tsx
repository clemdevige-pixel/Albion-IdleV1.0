import {
  PRODUCTION_FAMILY_IDS,
  PRODUCTION_TIERS,
  getProductionFamilyDefinition,
  isGatheringContentTier,
  isRefiningContentTier,
} from "../../data/productionFamilyCatalog";
import { RESOURCE_TIER_CONTENT } from "../../data/resourceContentCatalog";
import { getProductionRefiningRecipe } from "../../data/refiningRecipes";
import { useGameBridge, useGameServices } from "../../state/GameContext";
import { useResourceTracking } from "../dashboard/ResourceTrackingContext";
import "./storagePanel.css";

function quantityForItem(
  inventoryManager: ReturnType<typeof useGameServices>["inventoryManager"],
  storageId: ReturnType<typeof useGameServices>["productionStorageId"],
  itemId: string,
): number {
  return inventoryManager.findEntriesByItemId(storageId, itemId)
    .reduce((total, slot) => total + (slot.entry?.quantity ?? 0), 0);
}

export function StoragePanel(): JSX.Element {
  useGameBridge();
  const { inventoryManager, productionStorageId } = useGameServices();
  const tracking = useResourceTracking();
  const capacity = inventoryManager.getCapacity(productionStorageId);
  const occupied = inventoryManager.getOccupiedCount(productionStorageId);

  return (
    <div className="ui-island-storage">
      <div className="ui-island-storage__summary">
        <div>
          <small>Emplacements utilisés</small>
          <strong>{String(occupied)} / {String(capacity)}</strong>
        </div>
        <div>
          <small>Fonction</small>
          <strong>Stockage partagé</strong>
        </div>
      </div>

      <div className="ui-island-storage__families">
        {PRODUCTION_FAMILY_IDS.map((familyId) => {
          const family = getProductionFamilyDefinition(familyId);
          return (
            <section key={familyId} className="ui-island-storage__family">
              <header>
                <img src={`/assets/resources/${family.rawIcon}`} alt="" />
                <strong>{family.label}</strong>
              </header>
              <div className="ui-island-storage__tiers">
                {PRODUCTION_TIERS.map((tier) => {
                  const hasGatheringContent = isGatheringContentTier(tier);
                  const hasRefiningContent = isRefiningContentTier(tier);

                  if (!hasGatheringContent && !hasRefiningContent) {
                    return (
                      <div key={tier} className="ui-island-storage__tier is-pending">
                        <span>T{String(tier)}</span>
                        <div><small>Brut</small><b>—</b></div>
                        <div><small>Raffiné</small><b>—</b></div>
                      </div>
                    );
                  }

                  const rawContent = hasGatheringContent
                    ? RESOURCE_TIER_CONTENT[familyId][tier]
                    : undefined;
                  const rawQuantity = rawContent === undefined
                    ? undefined
                    : quantityForItem(inventoryManager, productionStorageId, rawContent.rawItemId);
                  const refiningRecipe = hasRefiningContent
                    ? getProductionRefiningRecipe(familyId, tier)
                    : undefined;
                  const refinedQuantity = refiningRecipe === undefined
                    ? undefined
                    : quantityForItem(inventoryManager, productionStorageId, refiningRecipe.outputItemId);
                  const trackingId = `production:${familyId}:t${String(tier)}`;
                  const entries = [
                    ...(rawContent === undefined ? [] : [{
                      itemId: rawContent.rawItemId,
                      label: "Brut",
                      source: "production" as const,
                    }]),
                    ...(refiningRecipe === undefined ? [] : [{
                      itemId: refiningRecipe.outputItemId,
                      label: "Raffiné",
                      source: "production" as const,
                    }]),
                  ];
                  const tracked = tracking.isTracked(trackingId);

                  return (
                    <div key={tier} className="ui-island-storage__tier">
                      <span>
                        T{String(tier)}
                        {entries.length > 0 && (
                          <button
                            type="button"
                            title={tracked ? "Ne plus suivre" : "Suivre ce tier dans la sidebar"}
                            aria-label={`${tracked ? "Ne plus suivre" : "Suivre"} ${family.label} T${String(tier)}`}
                            onClick={() => {
                              tracking.toggleTracked({
                                id: trackingId,
                                label: `${family.label} T${String(tier)}`,
                                entries,
                              });
                            }}
                          >
                            {tracked ? "★" : "☆"}
                          </button>
                        )}
                      </span>
                      <div><small>Brut</small><b>{rawQuantity === undefined ? "—" : String(rawQuantity)}</b></div>
                      <div><small>Raffiné</small><b>{refinedQuantity === undefined ? "—" : String(refinedQuantity)}</b></div>
                    </div>
                  );
                })}
              </div>
            </section>
          );
        })}
      </div>

      <div className="ui-island__selection-status">
        Gathering, workers, raffinage et craft utilisent déjà automatiquement ce stockage partagé.
      </div>
    </div>
  );
}

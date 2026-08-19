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
                  const rawLabel = family.tiers[tier]?.resourceName ?? `${family.rawMaterialLabel} T${String(tier)}`;
                  const refinedLabel = refiningRecipe?.name ?? `${family.label} raffiné T${String(tier)}`;
                  const rawIconSrc = `/assets/resources/${family.rawIcon}`;
                  const refinedIconSrc = `/assets/resources/${family.refinedIcon}`;

                  return (
                    <div key={tier} className="ui-island-storage__tier">
                      <span>T{String(tier)}</span>
                      <div>
                        <small>Brut</small>
                        <b>{rawQuantity === undefined ? "—" : String(rawQuantity)}</b>
                        {rawContent !== undefined && (
                          <button
                            type="button"
                            title={tracking.isTracked(rawContent.rawItemId) ? "Ne plus suivre" : "Suivre dans la sidebar"}
                            aria-label={`${tracking.isTracked(rawContent.rawItemId) ? "Ne plus suivre" : "Suivre"} ${rawLabel}`}
                            onClick={() => {
                              tracking.toggleTracked({ itemId: rawContent.rawItemId, label: rawLabel, iconSrc: rawIconSrc });
                            }}
                          >
                            {tracking.isTracked(rawContent.rawItemId) ? "★" : "☆"}
                          </button>
                        )}
                      </div>
                      <div>
                        <small>Raffiné</small>
                        <b>{refinedQuantity === undefined ? "—" : String(refinedQuantity)}</b>
                        {refiningRecipe !== undefined && (
                          <button
                            type="button"
                            title={tracking.isTracked(refiningRecipe.outputItemId) ? "Ne plus suivre" : "Suivre dans la sidebar"}
                            aria-label={`${tracking.isTracked(refiningRecipe.outputItemId) ? "Ne plus suivre" : "Suivre"} ${refinedLabel}`}
                            onClick={() => {
                              tracking.toggleTracked({ itemId: refiningRecipe.outputItemId, label: refinedLabel, iconSrc: refinedIconSrc });
                            }}
                          >
                            {tracking.isTracked(refiningRecipe.outputItemId) ? "★" : "☆"}
                          </button>
                        )}
                      </div>
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

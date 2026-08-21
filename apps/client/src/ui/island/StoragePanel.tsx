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

  return (
    <div className="ui-island-storage">
      <div className="ui-island-storage__families">
        {PRODUCTION_FAMILY_IDS.map((familyId) => {
          const family = getProductionFamilyDefinition(familyId);
          const tiers = PRODUCTION_TIERS.map((tier) => {
            const hasGatheringContent = isGatheringContentTier(tier);
            const hasRefiningContent = isRefiningContentTier(tier);
            const rawContent = hasGatheringContent
              ? RESOURCE_TIER_CONTENT[familyId][tier]
              : undefined;
            const refiningRecipe = hasRefiningContent
              ? getProductionRefiningRecipe(familyId, tier)
              : undefined;
            const rawQuantity = rawContent === undefined
              ? undefined
              : quantityForItem(inventoryManager, productionStorageId, rawContent.rawItemId);
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

            return {
              tier,
              rawQuantity,
              refinedQuantity,
              trackingId,
              entries,
              tracked: tracking.isTracked(trackingId),
              pending: !hasGatheringContent && !hasRefiningContent,
            };
          });

          return (
            <section key={familyId} className="ui-island-storage__family">
              <header>
                <img src={`/assets/resources/${family.rawIcon}`} alt="" />
                <strong>{family.label}</strong>
              </header>

              <div className="ui-island-storage__matrix">
                <div className="ui-island-storage__matrix-corner" aria-hidden="true" />
                {tiers.map(({ tier, trackingId, entries, tracked, pending }) => (
                  <div key={`head-${String(tier)}`} className={`ui-island-storage__tier-head${pending ? " is-pending" : ""}`}>
                    <span>T{String(tier)}</span>
                    {entries.length > 0 ? (
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
                    ) : null}
                  </div>
                ))}

                <strong className="ui-island-storage__row-label">Brut</strong>
                {tiers.map(({ tier, rawQuantity, pending }) => (
                  <span key={`raw-${String(tier)}`} className={`ui-island-storage__value${pending ? " is-pending" : ""}`}>
                    {rawQuantity === undefined ? "—" : String(rawQuantity)}
                  </span>
                ))}

                <strong className="ui-island-storage__row-label">Raffiné</strong>
                {tiers.map(({ tier, refinedQuantity, pending }) => (
                  <span key={`refined-${String(tier)}`} className={`ui-island-storage__value${pending ? " is-pending" : ""}`}>
                    {refinedQuantity === undefined ? "—" : String(refinedQuantity)}
                  </span>
                ))}
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

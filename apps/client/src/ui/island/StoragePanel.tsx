import {
  PRODUCTION_CONTENT_TIERS,
  PRODUCTION_FAMILY_IDS,
  PRODUCTION_TIERS,
  getProductionFamilyDefinition,
} from "../../data/productionFamilyCatalog";
import { getProductionRefiningRecipe } from "../../data/refiningRecipes";
import { useGameBridge, useGameServices } from "../../state/GameContext";
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
  // Production operations already update the bridge. Subscribing here keeps
  // this projection reactive without mirroring the storage in GameBridge.
  useGameBridge();
  const { inventoryManager, productionStorageId } = useGameServices();
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
                  const hasContent = PRODUCTION_CONTENT_TIERS.includes(
                    tier as (typeof PRODUCTION_CONTENT_TIERS)[number],
                  );

                  if (!hasContent) {
                    return (
                      <div key={tier} className="ui-island-storage__tier is-pending">
                        <span>T{String(tier)}</span>
                        <div><small>Brut</small><b>—</b></div>
                        <div><small>Raffiné</small><b>—</b></div>
                      </div>
                    );
                  }

                  const recipe = getProductionRefiningRecipe(
                    familyId,
                    tier as (typeof PRODUCTION_CONTENT_TIERS)[number],
                  );
                  const rawQuantity = quantityForItem(
                    inventoryManager,
                    productionStorageId,
                    recipe.rawItemId,
                  );
                  const refinedQuantity = quantityForItem(
                    inventoryManager,
                    productionStorageId,
                    recipe.outputItemId,
                  );

                  return (
                    <div key={tier} className="ui-island-storage__tier">
                      <span>T{String(tier)}</span>
                      <div>
                        <small>Brut</small>
                        <b>{String(rawQuantity)}</b>
                      </div>
                      <div>
                        <small>Raffiné</small>
                        <b>{String(refinedQuantity)}</b>
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

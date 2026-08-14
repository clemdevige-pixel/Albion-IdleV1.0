import {
  PLAYER_ISLAND_CONFIG,
  getIslandBuildingDefinition,
  type IslandBuildingDefinition,
  type IslandBuildingId,
} from "@game/data";
import {
  PRODUCTION_CONTENT_TIERS,
  PRODUCTION_FAMILY_IDS,
  getProductionFamilyDefinition,
} from "../../data/productionFamilyCatalog";
import { getProductionRefiningRecipe } from "../../data/refiningRecipes";
import { useGameBridge, useGameServices } from "../../state/GameContext";

function quantityForItem(
  inventoryManager: ReturnType<typeof useGameServices>["inventoryManager"],
  storageId: ReturnType<typeof useGameServices>["productionStorageId"],
  itemId: string,
): number {
  return inventoryManager.findEntriesByItemId(storageId, itemId)
    .reduce((total, slot) => total + (slot.entry?.quantity ?? 0), 0);
}

function materialLabel(itemId: string): string {
  for (const familyId of PRODUCTION_FAMILY_IDS) {
    const family = getProductionFamilyDefinition(familyId);
    for (const tier of PRODUCTION_CONTENT_TIERS) {
      const recipe = getProductionRefiningRecipe(familyId, tier);
      if (recipe.rawItemId === itemId) return `${family.rawMaterialLabel} T${String(tier)}`;
      if (recipe.outputItemId === itemId) return `${family.label} raffiné T${String(tier)}`;
    }
  }
  return itemId;
}

export function ConstructionPanel({
  plotId,
  builtDefinitionIds,
  onBuilt,
}: {
  readonly plotId: string;
  readonly builtDefinitionIds: ReadonlySet<IslandBuildingId>;
  readonly onBuilt: (definitionId: IslandBuildingId) => void;
}): JSX.Element {
  const { wallet } = useGameBridge();
  const {
    inventoryManager,
    productionStorageId,
    constructIslandBuilding,
  } = useGameServices();

  const availableBuildings = PLAYER_ISLAND_CONFIG.buildings.filter(
    (definition): definition is IslandBuildingDefinition & { construction: NonNullable<IslandBuildingDefinition["construction"]> } => (
      definition.construction !== undefined && !builtDefinitionIds.has(definition.id)
    ),
  );

  if (availableBuildings.length === 0) {
    return (
      <section className="ui-island__selection ui-island__selection--empty">
        <strong>Emplacement libre</strong>
        <p>Aucun bâtiment constructible supplémentaire n'est authoré pour cette phase.</p>
      </section>
    );
  }

  return (
    <section className="ui-island__selection ui-island-construction">
      <div>
        <span className="ui-island__eyebrow">Construction</span>
        <strong>Emplacement libre</strong>
      </div>
      <p>Les prérequis et coûts de construction viennent du catalogue Island.</p>

      <div className="ui-island-construction__list">
        {availableBuildings.map((definition) => {
          const construction = definition.construction;
          const missingPrerequisites = (construction.prerequisiteBuildings ?? [])
            .filter((buildingId) => !builtDefinitionIds.has(buildingId));
          const materialState = construction.requirements.map((requirement) => ({
            ...requirement,
            available: quantityForItem(inventoryManager, productionStorageId, requirement.itemId),
          }));
          const affordable = missingPrerequisites.length === 0
            && wallet.silver >= construction.silver
            && materialState.every((requirement) => requirement.available >= requirement.quantity);

          return (
            <article key={definition.id} className="ui-island-construction__card">
              <header>
                <span className="ui-island__selection-icon">{definition.icon}</span>
                <div>
                  <strong>{definition.label}</strong>
                  <small>{definition.description}</small>
                </div>
              </header>
              {missingPrerequisites.length > 0 && (
                <div className="ui-island-construction__costs">
                  {missingPrerequisites.map((buildingId) => (
                    <span key={buildingId} className="is-missing">
                      Requiert {getIslandBuildingDefinition(buildingId).label}
                    </span>
                  ))}
                </div>
              )}
              <div className="ui-island-construction__costs">
                <span className={wallet.silver >= construction.silver ? "is-ready" : "is-missing"}>
                  {String(construction.silver)} Silver
                </span>
                {materialState.map((requirement) => (
                  <span
                    key={requirement.itemId}
                    className={requirement.available >= requirement.quantity ? "is-ready" : "is-missing"}
                  >
                    {materialLabel(requirement.itemId)} {String(requirement.available)} / {String(requirement.quantity)}
                  </span>
                ))}
              </div>
              <button
                type="button"
                disabled={!affordable}
                onClick={() => {
                  if (constructIslandBuilding(definition.id, plotId)) onBuilt(definition.id);
                }}
              >
                {missingPrerequisites.length > 0
                  ? "Prérequis manquant"
                  : affordable ? "Construire" : "Ressources insuffisantes"}
              </button>
            </article>
          );
        })}
      </div>
    </section>
  );
}

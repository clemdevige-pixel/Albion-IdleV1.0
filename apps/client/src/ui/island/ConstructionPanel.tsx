import {
  PLAYER_ISLAND_CONFIG,
  type IslandBuildingDefinition,
  type IslandBuildingId,
} from "@game/data";
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
  if (itemId === "item_resource_wood_t3") return "Bois T3";
  if (itemId === "item_resource_copper_ore_t3") return "Minerai T3";
  if (itemId === "item_resource_hide_t3") return "Peau T3";
  if (itemId === "item_resource_fiber_t3") return "Fibre T3";
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
      <p>Les bâtiments de récolte utilisent uniquement des ressources T3 accessibles directement au héros.</p>

      <div className="ui-island-construction__list">
        {availableBuildings.map((definition) => {
          const construction = definition.construction;
          const materialState = construction.requirements.map((requirement) => ({
            ...requirement,
            available: quantityForItem(inventoryManager, productionStorageId, requirement.itemId),
          }));
          const affordable = wallet.silver >= construction.silver
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
                {affordable ? "Construire" : "Ressources insuffisantes"}
              </button>
            </article>
          );
        })}
      </div>
    </section>
  );
}

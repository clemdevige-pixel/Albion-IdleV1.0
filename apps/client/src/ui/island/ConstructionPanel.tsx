import {
  PLAYER_ISLAND_CONFIG,
  getIslandBuildingDefinition,
  getIslandLevelDefinition,
  getNextIslandLevelDefinition,
  type IslandBuildingDefinition,
  type IslandBuildingId,
} from "@game/data";
import { useGameBridge, useGameServices } from "../../state/GameContext";
import {
  getIslandMaterialLabel,
  getIslandMaterialQuantity,
} from "./islandMaterialPresentation";

export function ConstructionPanel({
  plotId,
  islandLevel,
  builtDefinitionIds,
  onBuilt,
}: {
  readonly plotId: string;
  readonly islandLevel: number;
  readonly builtDefinitionIds: ReadonlySet<IslandBuildingId>;
  readonly onBuilt: (definitionId: IslandBuildingId) => void;
}): JSX.Element {
  const { wallet } = useGameBridge();
  const {
    inventoryManager,
    productionStorageId,
    constructIslandBuilding,
  } = useGameServices();
  const currentIslandLevel = getIslandLevelDefinition(islandLevel);
  const nextIslandLevel = getNextIslandLevelDefinition(islandLevel);

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
      <p>Les prérequis, coûts et déblocages viennent du catalogue Island.</p>

      <div className="ui-island-construction__list">
        {availableBuildings.map((definition) => {
          const construction = definition.construction;
          const categoryUnlocked = currentIslandLevel?.unlockedCategories.includes(definition.category) === true;
          const unlockLevel = categoryUnlocked
            ? islandLevel
            : nextIslandLevel?.unlockedCategories.includes(definition.category) === true
              ? nextIslandLevel.level
              : undefined;
          const missingPrerequisites = (construction.prerequisiteBuildings ?? [])
            .filter((buildingId) => !builtDefinitionIds.has(buildingId));
          const materialState = construction.requirements.map((requirement) => ({
            ...requirement,
            available: getIslandMaterialQuantity(
              inventoryManager,
              productionStorageId,
              requirement.itemId,
            ),
          }));
          const affordable = categoryUnlocked
            && missingPrerequisites.length === 0
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
              {!categoryUnlocked && (
                <div className="ui-island-construction__costs">
                  <span className="is-missing">
                    {unlockLevel === undefined ? "Non débloqué" : `Requiert île niv. ${String(unlockLevel)}`}
                  </span>
                </div>
              )}
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
                    {getIslandMaterialLabel(requirement.itemId)} {String(requirement.available)} / {String(requirement.quantity)}
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
                {!categoryUnlocked
                  ? "Niveau d'île insuffisant"
                  : missingPrerequisites.length > 0
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

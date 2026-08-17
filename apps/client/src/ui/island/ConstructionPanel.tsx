import {
  PLAYER_ISLAND_CONFIG,
  getIslandBuildingDefinition,
  getIslandLevelDefinition,
  getNextIslandLevelDefinition,
  type IslandBuildingDefinition,
  type IslandBuildingId,
} from "@game/data";
import { useGameBridge, useGameServices } from "../../state/GameContext";
import { getIslandMaterialLabel, getIslandMaterialQuantity } from "./islandMaterialPresentation";

const CATEGORY_LABELS: Record<IslandBuildingDefinition["category"], string> = {
  workers: "Ouvriers",
  gathering: "Récolte",
  refining: "Raffinage",
  crafting: "Fabrication",
  storage: "Stockage",
};

export function ConstructionPanel({ plotId, islandLevel, builtDefinitionIds, onBuilt }: { readonly plotId: string; readonly islandLevel: number; readonly builtDefinitionIds: ReadonlySet<IslandBuildingId>; readonly onBuilt: (definitionId: IslandBuildingId) => void; }): JSX.Element {
  const { wallet } = useGameBridge();
  const { inventoryManager, productionStorageId, constructIslandBuilding } = useGameServices();
  const currentIslandLevel = getIslandLevelDefinition(islandLevel);
  const nextIslandLevel = getNextIslandLevelDefinition(islandLevel);
  const availableBuildings = PLAYER_ISLAND_CONFIG.buildings.filter((definition): definition is IslandBuildingDefinition & { construction: NonNullable<IslandBuildingDefinition["construction"]> } => definition.construction !== undefined && !builtDefinitionIds.has(definition.id));

  if (availableBuildings.length === 0) {
    return <section className="ui-island__selection ui-island__selection--empty"><strong>Emplacement libre</strong><p>Aucun bâtiment constructible supplémentaire n'est autorisé pour cette phase.</p></section>;
  }

  return <section className="ui-island-construction">
    <div className="ui-island-construction__heading"><span className="ui-island__eyebrow">Construction</span><strong>Emplacement libre</strong></div>
    <p>Choisissez un bâtiment. Les coûts et prérequis sont vérifiés automatiquement.</p>
    <div className="ui-island-construction__list">{availableBuildings.map((definition) => {
      const construction = definition.construction;
      const categoryUnlocked = currentIslandLevel?.unlockedCategories.includes(definition.category) === true;
      const unlockLevel = categoryUnlocked ? islandLevel : nextIslandLevel?.unlockedCategories.includes(definition.category) === true ? nextIslandLevel.level : undefined;
      const missingPrerequisites = (construction.prerequisiteBuildings ?? []).filter((buildingId) => !builtDefinitionIds.has(buildingId));
      const materialState = construction.requirements.map((requirement) => ({ ...requirement, available: getIslandMaterialQuantity(inventoryManager, productionStorageId, requirement.itemId) }));
      const flexibleState = construction.flexibleRequirement === undefined ? undefined : {
        ...construction.flexibleRequirement,
        entries: construction.flexibleRequirement.itemIds.map((itemId) => ({ itemId, available: getIslandMaterialQuantity(inventoryManager, productionStorageId, itemId) })),
      };
      const flexibleAvailableTotal = flexibleState?.entries.reduce((sum, entry) => sum + entry.available, 0) ?? 0;
      const flexibleDistinct = flexibleState?.entries.filter((entry) => entry.available > 0).length ?? 0;
      const flexibleAffordable = flexibleState === undefined || (flexibleAvailableTotal >= flexibleState.totalQuantity && flexibleDistinct >= flexibleState.minimumDistinctItemIds);
      const affordable = categoryUnlocked && missingPrerequisites.length === 0 && wallet.silver >= construction.silver && materialState.every((requirement) => requirement.available >= requirement.quantity) && flexibleAffordable;

      return <article key={definition.id} className={`ui-island-construction__card${affordable ? " is-buildable" : ""}`}>
        <header>
          <span className="ui-island__selection-icon">{definition.icon}</span>
          <div>
            <div className="ui-island-construction__title-row"><strong>{definition.label}</strong><span>{CATEGORY_LABELS[definition.category]}</span></div>
            <small>{definition.description}</small>
          </div>
        </header>
        {(!categoryUnlocked || missingPrerequisites.length > 0) && <div className="ui-island-construction__prerequisites">
          {!categoryUnlocked && <span>{unlockLevel === undefined ? "Non débloqué" : `Île niveau ${String(unlockLevel)} requise`}</span>}
          {missingPrerequisites.map((buildingId) => <span key={buildingId}>{getIslandBuildingDefinition(buildingId).label} requis</span>)}
        </div>}
        <div className="ui-island-construction__costs">
          <span className={wallet.silver >= construction.silver ? "is-ready" : "is-missing"}>{String(construction.silver)} Silver</span>
          {materialState.map((requirement) => <span key={requirement.itemId} className={requirement.available >= requirement.quantity ? "is-ready" : "is-missing"}>{getIslandMaterialLabel(requirement.itemId)} {String(requirement.available)} / {String(requirement.quantity)}</span>)}
          {flexibleState !== undefined && <span className={flexibleAffordable ? "is-ready" : "is-missing"}>Raffinés {String(flexibleAvailableTotal)} / {String(flexibleState.totalQuantity)} · {String(flexibleDistinct)} / {String(flexibleState.minimumDistinctItemIds)} familles</span>}
        </div>
        {affordable && <button type="button" onClick={() => { if (constructIslandBuilding(definition.id, plotId)) onBuilt(definition.id); }}>Construire</button>}
      </article>;
    })}</div>
  </section>;
}

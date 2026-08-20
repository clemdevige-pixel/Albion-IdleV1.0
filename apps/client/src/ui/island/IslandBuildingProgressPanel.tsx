import { getIslandLevelDefinition } from "@game/data";
import { useGameBridge, useGameServices } from "../../state/GameContext";
import { getIslandMaterialLabel } from "./islandMaterialPresentation";
import { getIslandBuildingUpgradeState } from "./islandBuildingUpgradeState";

export function IslandBuildingProgressPanel(): JSX.Element | null {
  const { island, wallet } = useGameBridge();
  const { getIslandLevel, inventoryManager, productionStorageId } = useGameServices();
  const islandLevel = getIslandLevel();
  const maxBuildingLevel = getIslandLevelDefinition(islandLevel)?.maxBuildingLevel ?? islandLevel;
  const laggingBuildings = island.buildings.filter((building) => building.level < maxBuildingLevel);

  if (laggingBuildings.length === 0) return null;

  return (
    <section className="ui-island-level ui-island-building-progress">
      <div className="ui-island-level__heading">
        <div>
          <span className="ui-island__eyebrow">Progression des bâtiments</span>
          <strong>{String(laggingBuildings.length)} bâtiment{laggingBuildings.length > 1 ? "s" : ""} à mettre à niveau</strong>
          <small>Objectif actuel : niveau {String(maxBuildingLevel)}</small>
        </div>
        <span className="ui-island__level">Niv. {String(maxBuildingLevel)}</span>
      </div>

      <div className="ui-island-building-progress__list">
        {laggingBuildings.map((building) => {
          const state = getIslandBuildingUpgradeState({
            definitionId: building.definitionId,
            level: building.level,
            islandLevel,
            silver: wallet.silver,
            inventoryManager,
            productionStorageId,
          });
          const { definition, next, cost, materials, flexible, flexibleDistinct, flexibleTotal, flexibleReady, silverReady } = state;

          if (next === undefined || cost === undefined) return null;

          return (
            <div key={building.instanceId} className="ui-island-building-progress__item">
              <div className="ui-island-building-progress__heading">
                <span className="ui-island-building-progress__icon" aria-hidden="true">{definition.icon}</span>
                <div>
                  <strong>{definition.label}</strong>
                  <small>Niv. {String(building.level)} → objectif Niv. {String(maxBuildingLevel)} · prochaine amélioration Niv. {String(next.level)}</small>
                </div>
              </div>

              <div className="ui-island-construction__costs">
                <span className={silverReady ? "is-ready" : "is-missing"}>
                  {String(wallet.silver)} / {String(cost.silver)} Silver
                </span>
                {materials.map((requirement) => (
                  <span key={requirement.itemId} className={requirement.available >= requirement.quantity ? "is-ready" : "is-missing"}>
                    {getIslandMaterialLabel(requirement.itemId)} {String(requirement.available)} / {String(requirement.quantity)}
                  </span>
                ))}
                {flexible !== undefined ? (
                  <span className={flexibleReady ? "is-ready" : "is-missing"}>
                    Raffinés flexibles {String(flexibleTotal)} / {String(flexible.totalQuantity)} · {String(flexibleDistinct)} / {String(flexible.minimumDistinctItemIds)} familles
                  </span>
                ) : null}
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}

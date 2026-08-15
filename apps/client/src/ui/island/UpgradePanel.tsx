import {
  getIslandBuildingDefinition,
  getIslandLevelDefinition,
  getIslandOperationalLevelDefinition,
  type IslandBuildingId,
} from "@game/data";
import { useGameBridge, useGameServices } from "../../state/GameContext";
import { getIslandMaterialLabel, getIslandMaterialQuantity } from "./islandMaterialPresentation";

export function UpgradePanel({ definitionId, level }: { readonly definitionId: IslandBuildingId; readonly level: number }): JSX.Element | null {
  const current = getIslandOperationalLevelDefinition(definitionId, level);
  if (current === undefined) return null;

  const { wallet } = useGameBridge();
  const { inventoryManager, productionStorageId, upgradeIslandBuilding, getIslandLevel } = useGameServices();
  const definition = getIslandBuildingDefinition(definitionId);
  const cost = current.upgradeToNext;

  if (cost === undefined) {
    return <div className="ui-island__selection-status">{definition.label} au niveau maximum · T{String(current.maxProductionTier)} débloqué</div>;
  }

  const next = getIslandOperationalLevelDefinition(definitionId, level + 1);
  if (next === undefined) return null;

  const islandLevel = getIslandLevel();
  const islandDefinition = getIslandLevelDefinition(islandLevel);
  const maxBuildingLevel = islandDefinition?.maxBuildingLevel ?? islandLevel;
  const islandLevelBlocked = next.level > maxBuildingLevel;
  const materials = cost.requirements.map((requirement) => ({
    ...requirement,
    available: getIslandMaterialQuantity(inventoryManager, productionStorageId, requirement.itemId),
  }));
  const silverReady = wallet.silver >= cost.silver;
  const affordable = silverReady && materials.every((requirement) => requirement.available >= requirement.quantity);
  const canUpgrade = !islandLevelBlocked && affordable;

  return (
    <section className="ui-island-upgrade">
      <div className="ui-island-upgrade__heading">
        <div>
          <span className="ui-island__eyebrow">Amélioration</span>
          <strong>Niv. {String(level)} → Niv. {String(next.level)}</strong>
        </div>
        <span className={islandLevelBlocked ? "ui-island-upgrade__unlock is-locked" : "ui-island-upgrade__unlock"}>
          {islandLevelBlocked ? `Île niv. ${String(next.level)} requise` : `T${String(next.maxProductionTier)} débloqué`}
        </span>
      </div>

      <div className="ui-island-upgrade__requirements">
        <div className={islandLevelBlocked ? "ui-island-upgrade__requirement is-missing" : "ui-island-upgrade__requirement is-ready"}>
          <span className="ui-island-upgrade__requirement-icon" aria-hidden="true">⌂</span>
          <div>
            <small>Bâtiments max niv. {String(maxBuildingLevel)}</small>
            <strong>{String(maxBuildingLevel)} / {String(next.level)}</strong>
          </div>
        </div>

        <div className={silverReady ? "ui-island-upgrade__requirement is-ready" : "ui-island-upgrade__requirement is-missing"}>
          <span className="ui-island-upgrade__requirement-icon" aria-hidden="true">◉</span>
          <div>
            <small>{String(cost.silver)} Silver</small>
            <strong>{String(wallet.silver)} / {String(cost.silver)}</strong>
          </div>
        </div>

        {materials.map((requirement) => {
          const ready = requirement.available >= requirement.quantity;
          return (
            <div key={requirement.itemId} className={ready ? "ui-island-upgrade__requirement is-ready" : "ui-island-upgrade__requirement is-missing"}>
              <span className="ui-island-upgrade__requirement-icon" aria-hidden="true">◆</span>
              <div>
                <small>{getIslandMaterialLabel(requirement.itemId)}</small>
                <strong>{String(requirement.available)} / {String(requirement.quantity)}</strong>
              </div>
            </div>
          );
        })}
      </div>

      <button type="button" disabled={!canUpgrade} onClick={() => { upgradeIslandBuilding(definitionId); }}>
        {islandLevelBlocked
          ? `🔒  Débloquez bâtiments niv. ${String(next.level)}`
          : affordable
            ? `⬆  Améliorer au niveau ${String(next.level)}`
            : "Ressources insuffisantes"}
      </button>
    </section>
  );
}

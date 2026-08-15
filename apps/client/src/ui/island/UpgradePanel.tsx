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
  const materials = cost.requirements.map((requirement) => ({ ...requirement, available: getIslandMaterialQuantity(inventoryManager, productionStorageId, requirement.itemId) }));
  const affordable = wallet.silver >= cost.silver && materials.every((requirement) => requirement.available >= requirement.quantity);
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
      <div className="ui-island-construction__costs ui-island-upgrade__costs">
        {islandLevelBlocked && <span className="is-missing">Bâtiments max niv. {String(maxBuildingLevel)}</span>}
        <span className={wallet.silver >= cost.silver ? "is-ready" : "is-missing"}>◉ {String(cost.silver)} Silver</span>
        {materials.map((requirement) => (
          <span key={requirement.itemId} className={requirement.available >= requirement.quantity ? "is-ready" : "is-missing"}>
            {getIslandMaterialLabel(requirement.itemId)} <b>{String(requirement.available)} / {String(requirement.quantity)}</b>
          </span>
        ))}
      </div>
      <button type="button" disabled={!canUpgrade} onClick={() => { upgradeIslandBuilding(definitionId); }}>
        {islandLevelBlocked ? `Débloquez bâtiments niv. ${String(next.level)}` : affordable ? `⬆  Améliorer au niveau ${String(next.level)}` : "Ressources insuffisantes"}
      </button>
    </section>
  );
}

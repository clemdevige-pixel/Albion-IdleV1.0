import {
  getIslandLevelDefinition,
  getNextIslandLevelDefinition,
} from "@game/data";
import { useGameBridge, useGameServices } from "../../state/GameContext";
import {
  getIslandMaterialLabel,
  getIslandMaterialQuantity,
} from "./islandMaterialPresentation";
import "./islandLevel.css";

export function IslandLevelPanel(): JSX.Element {
  const { wallet } = useGameBridge();
  const {
    getIslandLevel,
    upgradeIslandLevel,
    isWorldRequirementMet,
    inventoryManager,
    productionStorageId,
  } = useGameServices();
  const level = getIslandLevel();
  const current = getIslandLevelDefinition(level);
  const next = getNextIslandLevelDefinition(level);

  if (current === undefined) {
    return <section className="ui-island__selection-status">Progression d'île indisponible.</section>;
  }

  if (next === undefined) {
    return (
      <section className="ui-island-level">
        <div>
          <span className="ui-island__eyebrow">Progression de l'île</span>
          <strong>Île niveau {String(level)} · {current.label}</strong>
          <small>Niveau maximum actuellement authoré · bâtiments jusqu'au niveau {String(current.maxBuildingLevel)}</small>
        </div>
      </section>
    );
  }

  const worldRequirement = next.worldRequirementToReach;
  const worldReady = worldRequirement === undefined || isWorldRequirementMet(worldRequirement);
  const cost = next.upgradeCost;
  const materials = (cost?.requirements ?? []).map((entry) => ({
    ...entry,
    available: getIslandMaterialQuantity(inventoryManager, productionStorageId, entry.itemId),
  }));
  const economyReady = cost !== undefined
    && wallet.silver >= cost.silver
    && materials.every((entry) => entry.available >= entry.quantity);
  const canUpgrade = worldReady && economyReady;

  return (
    <section className="ui-island-level">
      <div className="ui-island-level__heading">
        <div>
          <span className="ui-island__eyebrow">Progression de l'île</span>
          <strong>Île niveau {String(level)} · {current.label}</strong>
          <small>Prochain palier : niveau {String(next.level)} · {next.label}</small>
        </div>
        <span className="ui-island__level">Niv. {String(level)}</span>
      </div>

      {worldRequirement !== undefined && (
        <div className="ui-island-level__requirements">
          <span className={worldReady ? "is-ready" : "is-missing"}>
            Monde · {worldRequirement.label}
          </span>
        </div>
      )}

      {cost !== undefined && (
        <div className="ui-island-construction__costs">
          <span className={wallet.silver >= cost.silver ? "is-ready" : "is-missing"}>
            {String(cost.silver)} Silver
          </span>
          {materials.map((entry) => (
            <span key={entry.itemId} className={entry.available >= entry.quantity ? "is-ready" : "is-missing"}>
              {getIslandMaterialLabel(entry.itemId)} {String(entry.available)} / {String(entry.quantity)}
            </span>
          ))}
        </div>
      )}

      <div className="ui-island-level__unlocks">
        Débloque : amélioration des bâtiments jusqu'au niveau {String(next.maxBuildingLevel)}
      </div>

      <button type="button" disabled={!canUpgrade} onClick={() => { upgradeIslandLevel(); }}>
        {!worldReady
          ? worldRequirement?.label ?? "Progression Monde insuffisante"
          : !economyReady
            ? "Ressources insuffisantes"
            : `Améliorer l'île au niveau ${String(next.level)}`}
      </button>
    </section>
  );
}

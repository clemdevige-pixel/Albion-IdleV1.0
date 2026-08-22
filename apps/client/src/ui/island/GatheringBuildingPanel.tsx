import { useState } from "react";
import {
  getIslandBuildingDefinition,
  getIslandMaxProductionTier,
  type IslandBuildingId,
} from "@game/data";
import {
  GATHERING_CONTENT_TIERS,
  PRODUCTION_TIERS,
  getProductionFamilyDefinition,
  type ProductionTier,
} from "../../data/productionFamilyCatalog";
import { getProductionRefiningRecipe } from "../../data/refiningRecipes";
import { getRequiredGatheringMasteryForTier } from "../../data/progressionContentCatalog";
import { useGameBridge, useGameServices } from "../../state/GameContext";
import { getIslandMaterialQuantity } from "./islandMaterialPresentation";
import "./gatheringBuilding.css";

export function GatheringBuildingPanel({
  definitionId,
  islandLevel,
}: {
  readonly definitionId: IslandBuildingId;
  readonly islandLevel: number;
}): JSX.Element {
  const definition = getIslandBuildingDefinition(definitionId);
  const service = definition.gatheringService;
  if (service === undefined) throw new Error(`Gathering building ${definitionId} has no gathering service data`);

  const maxTier = getIslandMaxProductionTier(islandLevel);
  if (maxTier === undefined) throw new Error(`Island level ${String(islandLevel)} has no production tier data`);

  const { workers } = useGameBridge();
  const {
    toggleWorker,
    inventoryManager,
    productionStorageId,
  } = useGameServices();
  const family = getProductionFamilyDefinition(service.productionFamily);
  const worker = workers.workers.find((candidate) => candidate.profession === service.workerProfession);
  const workerTier = worker?.productionTier ?? GATHERING_CONTENT_TIERS[0];
  const initialTier = workerTier > maxTier ? maxTier : workerTier;
  const [selectedTier, setSelectedTier] = useState<ProductionTier>(initialTier);
  const selectedTierIsAuthored = GATHERING_CONTENT_TIERS.some((tier) => tier === selectedTier);
  const requiredMastery = selectedTierIsAuthored ? getRequiredGatheringMasteryForTier(selectedTier) : Number.POSITIVE_INFINITY;
  const masteryBlocked = worker !== undefined && worker.mastery < requiredMastery;
  const progress = worker === undefined ? 0 : Math.max(0, Math.min(100, worker.progress));
  const selectedRawItemId = selectedTierIsAuthored
    ? getProductionRefiningRecipe(service.productionFamily, selectedTier).rawItemId
    : undefined;
  const currentStock = selectedRawItemId === undefined
    ? 0
    : getIslandMaterialQuantity(inventoryManager, productionStorageId, selectedRawItemId);

  return (
    <div className="ui-island-gathering-building">
      <div className="ui-island-gathering-building__resource">
        <span className="ui-island-gathering-building__resource-icon">
          <img src={`/assets/resources/${family.rawIcon}`} alt="" />
        </span>
        <div>
          <small>Ressource produite</small>
          <strong>{family.label}</strong>
          <em>Production passive jusqu’au <b>T{String(maxTier)}</b></em>
        </div>
        <div className="ui-island-gathering-building__stock">
          <small>Stock T{String(selectedTier)}</small>
          <strong>{selectedTierIsAuthored ? String(currentStock) : "—"}</strong>
        </div>
      </div>

      {worker === undefined ? (
        <div className="ui-island__selection-status">
          Étape suivante : recrutez un {family.professionName.toLocaleLowerCase("fr-FR")} depuis la Maison des ouvriers. Il produira automatiquement ici pendant que le héros peut gather activement en parallèle.
        </div>
      ) : (
        <>
          <div className="ui-island-gathering-building__worker">
            <span className="ui-island-gathering-building__worker-avatar" aria-hidden="true">
              <img src={family.professionIcon} alt="" />
            </span>
            <div>
              <small>Ouvrier affectable</small>
              <strong>{worker.displayName} · {worker.professionName}</strong>
            </div>
            <span className={`ui-island-gathering-building__worker-state is-${worker.state}`}>
              <i />{worker.state === "working" ? "En production" : worker.state === "paused" ? "En pause" : "Disponible"}
            </span>
          </div>

          <div className="ui-island-gathering-building__hint">
            {worker.state === "working"
              ? "Production automatique active. Le gather actif du héros peut accélérer cette même ressource."
              : `Sélectionnez T${String(selectedTier)} puis lancez la production.`}
          </div>

          <div className="ui-island-gathering-building__tiers" role="group" aria-label="Tier de production du worker">
            {PRODUCTION_TIERS.map((tier) => {
              const authored = GATHERING_CONTENT_TIERS.some((contentTier) => contentTier === tier);
              const masteryLocked = authored && worker.mastery < getRequiredGatheringMasteryForTier(tier);
              const islandLocked = tier > maxTier;
              const unavailable = !authored || masteryLocked || islandLocked;
              const title = !authored
                ? `T${String(tier)} prévu pour le futur contenu`
                : islandLocked
                  ? `Améliorez l’île pour débloquer T${String(tier)}`
                  : masteryLocked
                    ? `Maîtrise ${String(getRequiredGatheringMasteryForTier(tier))} requise`
                    : undefined;
              return (
                <button
                  key={tier}
                  type="button"
                  className={selectedTier === tier ? "is-active" : ""}
                  disabled={unavailable}
                  title={title}
                  onClick={() => { setSelectedTier(tier); }}
                >
                  T{String(tier)}{unavailable ? <span aria-hidden="true"> 🔒</span> : null}
                </button>
              );
            })}
          </div>

          <div className="ui-island-gathering-building__facts">
            <span><b>◆</b><small>Maîtrise</small><strong>{String(worker.mastery)}</strong></span>
            <span><b>◷</b><small>Cycle</small><strong>{String(worker.yieldPerCycle)} / {String(worker.durationSeconds)} s</strong></span>
            <span><small>Tier actuel</small><strong>T{String(worker.productionTier)}</strong></span>
          </div>

          <div className="ui-island-gathering-building__progress-block">
            <div><span>Progression récolte (T{String(worker.productionTier)})</span><strong>{String(Math.round(progress))}%</strong></div>
            <div className="ui-island-gathering-building__progress"><span style={{ width: `${String(progress)}%` }} /></div>
          </div>

          <button
            className="ui-island-gathering-building__action"
            type="button"
            disabled={masteryBlocked || selectedTier > maxTier || !selectedTierIsAuthored}
            onClick={() => { toggleWorker(service.workerProfession, selectedTier); }}
          >
            {masteryBlocked
              ? `Maîtrise ${String(requiredMastery)} requise`
              : worker.state === "working" && worker.productionTier === selectedTier
                ? "Ⅱ  Mettre en pause"
                : worker.productionTier !== selectedTier
                  ? `Affecter au T${String(selectedTier)}`
                  : worker.state === "paused" ? "▶  Reprendre la production" : "▶  Lancer la production"}
          </button>
        </>
      )}
    </div>
  );
}

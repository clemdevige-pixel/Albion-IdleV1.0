import { useState } from "react";
import {
  getIslandBuildingDefinition,
  getIslandMaxProductionTier,
  type IslandBuildingId,
} from "@game/data";
import type { WorkerVM } from "../../game/GameBridge";
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
  const family = getProductionFamilyDefinition(service.productionFamily);
  const professionWorkers = workers.workers.filter(
    (candidate) => candidate.profession === service.workerProfession,
  );

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
          <small>Ouvriers affectés</small>
          <strong>{String(professionWorkers.length)} / {String(workers.professionCapacity)}</strong>
        </div>
      </div>

      {professionWorkers.length === 0 ? (
        <div className="ui-island__selection-status">
          Étape suivante : recrutez un {family.professionName.toLocaleLowerCase("fr-FR")} depuis la Maison des ouvriers. Il produira automatiquement ici pendant que le héros peut gather activement en parallèle.
        </div>
      ) : professionWorkers.map((worker, index) => (
        <GatheringWorkerControl
          key={worker.id}
          worker={worker}
          professionWorkers={professionWorkers}
          workerIndex={index}
          maxTier={maxTier}
          productionFamily={service.productionFamily}
        />
      ))}
    </div>
  );
}

function GatheringWorkerControl({
  worker,
  professionWorkers,
  workerIndex,
  maxTier,
  productionFamily,
}: {
  readonly worker: WorkerVM;
  readonly professionWorkers: readonly WorkerVM[];
  readonly workerIndex: number;
  readonly maxTier: ProductionTier;
  readonly productionFamily: "wood" | "ore" | "hide" | "fiber";
}): JSX.Element {
  const {
    toggleWorker,
    inventoryManager,
    productionStorageId,
  } = useGameServices();
  const family = getProductionFamilyDefinition(productionFamily);
  const initialTier = worker.productionTier > maxTier ? maxTier : worker.productionTier;
  const [selectedTier, setSelectedTier] = useState<ProductionTier>(initialTier);
  const selectedTierIsAuthored = GATHERING_CONTENT_TIERS.some((tier) => tier === selectedTier);
  const requiredMastery = selectedTierIsAuthored
    ? getRequiredGatheringMasteryForTier(selectedTier)
    : Number.POSITIVE_INFINITY;
  const masteryBlocked = worker.mastery < requiredMastery;
  const selectedTierOccupied = professionWorkers.some((candidate) => (
    candidate.id !== worker.id
    && candidate.state === "working"
    && candidate.productionTier === selectedTier
  ));
  const progress = Math.max(0, Math.min(100, worker.progress));
  const selectedRawItemId = selectedTierIsAuthored
    ? getProductionRefiningRecipe(productionFamily, selectedTier).rawItemId
    : undefined;
  const currentStock = selectedRawItemId === undefined
    ? 0
    : getIslandMaterialQuantity(inventoryManager, productionStorageId, selectedRawItemId);

  return (
    <section className="ui-island-gathering-building__worker-control">
      <div className="ui-island-gathering-building__worker">
        <span className="ui-island-gathering-building__worker-avatar" aria-hidden="true">
          <img src={family.professionIcon} alt="" />
        </span>
        <div>
          <small>Ouvrier {String(workerIndex + 1)}</small>
          <strong>{worker.displayName} · {worker.professionName}</strong>
        </div>
        <span className={`ui-island-gathering-building__worker-state is-${worker.state}`}>
          <i />{worker.state === "working" ? "En production" : worker.state === "paused" ? "En pause" : "Disponible"}
        </span>
      </div>

      <div className="ui-island-gathering-building__hint">
        {worker.state === "working"
          ? `Production automatique active en T${String(worker.productionTier)}.`
          : selectedTierOccupied
            ? `T${String(selectedTier)} déjà occupé par l’autre ${family.professionName.toLocaleLowerCase("fr-FR")}.`
            : `Sélectionnez T${String(selectedTier)} puis lancez la production.`}
      </div>

      <div className="ui-island-gathering-building__tiers" role="group" aria-label={`Tier de production de ${worker.displayName}`}>
        {PRODUCTION_TIERS.map((tier) => {
          const authored = GATHERING_CONTENT_TIERS.some((contentTier) => contentTier === tier);
          const masteryLocked = authored && worker.mastery < getRequiredGatheringMasteryForTier(tier);
          const islandLocked = tier > maxTier;
          const tierOccupied = professionWorkers.some((candidate) => (
            candidate.id !== worker.id
            && candidate.state === "working"
            && candidate.productionTier === tier
          ));
          const unavailable = !authored || masteryLocked || islandLocked || tierOccupied;
          const title = !authored
            ? `T${String(tier)} prévu pour le futur contenu`
            : islandLocked
              ? `Améliorez l’île pour débloquer T${String(tier)}`
              : masteryLocked
                ? `Maîtrise ${String(getRequiredGatheringMasteryForTier(tier))} requise`
                : tierOccupied
                  ? `Un autre ${family.professionName.toLocaleLowerCase("fr-FR")} travaille déjà en T${String(tier)}`
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
        <span><small>Stock T{String(selectedTier)}</small><strong>{selectedTierIsAuthored ? String(currentStock) : "—"}</strong></span>
      </div>

      <div className="ui-island-gathering-building__progress-block">
        <div><span>Progression récolte (T{String(worker.productionTier)})</span><strong>{String(Math.round(progress))}%</strong></div>
        <div className="ui-island-gathering-building__progress"><span style={{ width: `${String(progress)}%` }} /></div>
      </div>

      <button
        className="ui-island-gathering-building__action"
        type="button"
        disabled={masteryBlocked || selectedTierOccupied || selectedTier > maxTier || !selectedTierIsAuthored}
        onClick={() => { toggleWorker(worker.id, selectedTier); }}
      >
        {masteryBlocked
          ? `Maîtrise ${String(requiredMastery)} requise`
          : selectedTierOccupied
            ? `T${String(selectedTier)} déjà occupé`
            : worker.state === "working" && worker.productionTier === selectedTier
              ? "Ⅱ  Mettre en pause"
              : worker.productionTier !== selectedTier
                ? `Affecter au T${String(selectedTier)}`
                : worker.state === "paused" ? "▶  Reprendre la production" : "▶  Lancer la production"}
      </button>
    </section>
  );
}

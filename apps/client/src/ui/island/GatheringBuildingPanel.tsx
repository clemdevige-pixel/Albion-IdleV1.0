import { useState } from "react";
import {
  getIslandBuildingDefinition,
  getIslandBuildingMaxProductionTier,
  type IslandBuildingId,
} from "@game/data";
import {
  PRODUCTION_CONTENT_TIERS,
  getProductionFamilyDefinition,
} from "../../data/productionFamilyCatalog";
import { getRequiredGatheringMasteryForTier } from "../../data/progressionContentCatalog";
import { useGameBridge, useGameServices } from "../../state/GameContext";
import "./gatheringBuilding.css";

export function GatheringBuildingPanel({
  definitionId,
  level,
}: {
  readonly definitionId: IslandBuildingId;
  readonly level: number;
}): JSX.Element {
  const definition = getIslandBuildingDefinition(definitionId);
  const service = definition.gatheringService;
  if (service === undefined) {
    throw new Error(`Gathering building ${definitionId} has no gathering service data`);
  }

  const maxTier = getIslandBuildingMaxProductionTier(definitionId, level);
  if (maxTier === undefined) {
    throw new Error(`Gathering building ${definitionId} level ${String(level)} has no progression data`);
  }

  const { workers } = useGameBridge();
  const { toggleWorker } = useGameServices();
  const family = getProductionFamilyDefinition(service.productionFamily);
  const worker = workers.workers.find((candidate) => candidate.profession === service.workerProfession);
  const workerTier = worker?.productionTier ?? PRODUCTION_CONTENT_TIERS[0];
  const initialTier = workerTier > maxTier ? maxTier : workerTier;
  const [selectedTier, setSelectedTier] = useState(initialTier);
  const requiredMastery = getRequiredGatheringMasteryForTier(selectedTier);
  const masteryBlocked = worker !== undefined && worker.mastery < requiredMastery;

  return (
    <div className="ui-island-gathering-building">
      <div className="ui-island-gathering-building__resource">
        <img src={`/assets/resources/${family.rawIcon}`} alt="" />
        <div>
          <small>Production passive · jusqu’au T{String(maxTier)}</small>
          <strong>{family.label}</strong>
        </div>
      </div>

      {worker === undefined ? (
        <div className="ui-island__selection-status">
          Étape suivante : recrutez un {family.professionName.toLocaleLowerCase("fr-FR")} depuis la Maison des ouvriers. Il produira automatiquement ici pendant que le héros peut gather activement en parallèle.
        </div>
      ) : (
        <>
          <div className="ui-island-gathering-building__worker">
            <div>
              <small>Ouvrier affectable</small>
              <strong>{worker.displayName} · {worker.professionName}</strong>
            </div>
            <span className={`is-${worker.state}`}>
              {worker.state === "working" ? "En production" : worker.state === "paused" ? "En pause" : "Disponible"}
            </span>
          </div>

          {worker.state !== "working" ? (
            <div className="ui-island__selection-status">
              Sélectionnez T{String(selectedTier)} puis lancez la production. Le worker récoltera automatiquement ; le gather actif du héros reste disponible en parallèle.
            </div>
          ) : (
            <div className="ui-island__selection-status">
              Production automatique active. Vous pouvez maintenant gather activement la même ressource pour accélérer votre progression.
            </div>
          )}

          <div className="ui-island-gathering-building__tiers" role="group" aria-label="Tier de production du worker">
            {PRODUCTION_CONTENT_TIERS.map((tier) => {
              const masteryLocked = worker.mastery < getRequiredGatheringMasteryForTier(tier);
              const buildingLocked = tier > maxTier;
              return (
                <button
                  key={tier}
                  type="button"
                  className={selectedTier === tier ? "is-active" : ""}
                  disabled={masteryLocked || buildingLocked}
                  title={buildingLocked ? `Améliorez le bâtiment pour débloquer T${String(tier)}` : undefined}
                  onClick={() => { setSelectedTier(tier); }}
                >
                  T{String(tier)}{buildingLocked ? " 🔒" : ""}
                </button>
              );
            })}
          </div>

          <div className="ui-island-gathering-building__facts">
            <span>Maîtrise {String(worker.mastery)}</span>
            <span>{String(worker.yieldPerCycle)} / {String(worker.durationSeconds)} s</span>
            <span>T{String(worker.productionTier)} actuel</span>
          </div>

          <div className="ui-island-gathering-building__progress">
            <span style={{ width: `${String(Math.max(0, Math.min(100, worker.progress)))}%` }} />
          </div>

          <button
            className="ui-island-gathering-building__action"
            type="button"
            disabled={masteryBlocked || selectedTier > maxTier}
            onClick={() => { toggleWorker(service.workerProfession, selectedTier); }}
          >
            {masteryBlocked
              ? `Maîtrise ${String(requiredMastery)} requise`
              : worker.state === "working" && worker.productionTier === selectedTier
                ? "Mettre en pause"
                : worker.productionTier !== selectedTier
                  ? `Affecter au T${String(selectedTier)}`
                  : worker.state === "paused" ? "Reprendre la production" : "Lancer la production"}
          </button>
        </>
      )}
    </div>
  );
}

import { useState } from "react";
import {
  getIslandBuildingDefinition,
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
}: {
  readonly definitionId: IslandBuildingId;
}): JSX.Element {
  const definition = getIslandBuildingDefinition(definitionId);
  const service = definition.gatheringService;
  if (service === undefined) {
    throw new Error(`Gathering building ${definitionId} has no gathering service data`);
  }

  const { workers } = useGameBridge();
  const { toggleWorker } = useGameServices();
  const family = getProductionFamilyDefinition(service.productionFamily);
  const worker = workers.workers.find((candidate) => candidate.profession === service.workerProfession);
  const [selectedTier, setSelectedTier] = useState(worker?.productionTier ?? PRODUCTION_CONTENT_TIERS[0]);
  const requiredMastery = getRequiredGatheringMasteryForTier(selectedTier);
  const masteryBlocked = worker !== undefined && worker.mastery < requiredMastery;

  return (
    <div className="ui-island-gathering-building">
      <div className="ui-island-gathering-building__resource">
        <img src={`/assets/resources/${family.rawIcon}`} alt="" />
        <div>
          <small>Production passive</small>
          <strong>{family.label}</strong>
        </div>
      </div>

      {worker === undefined ? (
        <div className="ui-island__selection-status">
          Aucun {family.professionName.toLocaleLowerCase("fr-FR")} recruté. Recrutez-le depuis la Maison des ouvriers.
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

          <div className="ui-island-gathering-building__tiers" role="group" aria-label="Tier de production du worker">
            {PRODUCTION_CONTENT_TIERS.map((tier) => {
              const locked = worker.mastery < getRequiredGatheringMasteryForTier(tier);
              return (
                <button
                  key={tier}
                  type="button"
                  className={selectedTier === tier ? "is-active" : ""}
                  disabled={locked}
                  onClick={() => { setSelectedTier(tier); }}
                >
                  T{String(tier)}
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
            disabled={masteryBlocked}
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

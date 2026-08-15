import { useState } from "react";
import {
  getIslandBuildingDefinition,
  getIslandBuildingMaxProductionTier,
  type IslandBuildingId,
  type IslandWorkerProfession,
} from "@game/data";
import {
  PRODUCTION_CONTENT_TIERS,
  getProductionFamilyDefinition,
} from "../../data/productionFamilyCatalog";
import { getRequiredGatheringMasteryForTier } from "../../data/progressionContentCatalog";
import { useGameBridge, useGameServices } from "../../state/GameContext";
import "./gatheringBuilding.css";

const WORKER_PROFESSION_ICONS: Readonly<Record<IslandWorkerProfession, string>> = {
  woodcutter: "🪓",
  miner: "⛏",
  skinner: "🗡",
  fiber_harvester: "🌾",
};

export function GatheringBuildingPanel({
  definitionId,
  level,
}: {
  readonly definitionId: IslandBuildingId;
  readonly level: number;
}): JSX.Element {
  const definition = getIslandBuildingDefinition(definitionId);
  const service = definition.gatheringService;
  if (service === undefined) throw new Error(`Gathering building ${definitionId} has no gathering service data`);

  const maxTier = getIslandBuildingMaxProductionTier(definitionId, level);
  if (maxTier === undefined) throw new Error(`Gathering building ${definitionId} level ${String(level)} has no progression data`);

  const { workers } = useGameBridge();
  const { toggleWorker } = useGameServices();
  const family = getProductionFamilyDefinition(service.productionFamily);
  const worker = workers.workers.find((candidate) => candidate.profession === service.workerProfession);
  const workerTier = worker?.productionTier ?? PRODUCTION_CONTENT_TIERS[0];
  const initialTier = workerTier > maxTier ? maxTier : workerTier;
  const [selectedTier, setSelectedTier] = useState(initialTier);
  const requiredMastery = getRequiredGatheringMasteryForTier(selectedTier);
  const masteryBlocked = worker !== undefined && worker.mastery < requiredMastery;
  const progress = worker === undefined ? 0 : Math.max(0, Math.min(100, worker.progress));

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
      </div>

      {worker === undefined ? (
        <div className="ui-island__selection-status">
          Étape suivante : recrutez un {family.professionName.toLocaleLowerCase("fr-FR")} depuis la Maison des ouvriers. Il produira automatiquement ici pendant que le héros peut gather activement en parallèle.
        </div>
      ) : (
        <>
          <div className="ui-island-gathering-building__worker">
            <span className="ui-island-gathering-building__worker-avatar" aria-hidden="true">
              {WORKER_PROFESSION_ICONS[service.workerProfession]}
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
              ? "Production automatique active. Vous pouvez maintenant gather activement la même ressource pour accélérer votre progression."
              : `Sélectionnez T${String(selectedTier)} puis lancez la production. Le gather actif du héros reste disponible en parallèle.`}
          </div>

          <div className="ui-island-gathering-building__tiers" role="group" aria-label="Tier de production du worker">
            {PRODUCTION_CONTENT_TIERS.map((tier) => {
              const requiredTierMastery = getRequiredGatheringMasteryForTier(tier);
              const masteryLocked = worker.mastery < requiredTierMastery;
              const buildingLocked = tier > maxTier;
              return (
                <button
                  key={tier}
                  type="button"
                  className={selectedTier === tier ? "is-active" : ""}
                  disabled={masteryLocked || buildingLocked}
                  title={buildingLocked ? `Améliorez le bâtiment pour débloquer T${String(tier)}` : masteryLocked ? `Maîtrise ${String(requiredTierMastery)} requise` : undefined}
                  onClick={() => { setSelectedTier(tier); }}
                >
                  <span>T{String(tier)}</span>
                  {buildingLocked || masteryLocked ? <b aria-hidden="true">🔒</b> : null}
                </button>
              );
            })}
          </div>

          <div className="ui-island-gathering-building__facts">
            <span>
              <b className="ui-island-gathering-building__fact-icon">◆</b>
              <small>Maîtrise</small>
              <strong>{String(worker.mastery)}</strong>
            </span>
            <span>
              <b className="ui-island-gathering-building__fact-icon">◷</b>
              <small>Cycle</small>
              <strong>{String(worker.yieldPerCycle)} / {String(worker.durationSeconds)} s</strong>
            </span>
            <span>
              <small>Tier actuel</small>
              <strong>T{String(worker.productionTier)}</strong>
            </span>
          </div>

          <div className="ui-island-gathering-building__progress-block">
            <div>
              <span>Progression récolte (T{String(worker.productionTier)})</span>
              <strong>{String(Math.round(progress))}%</strong>
            </div>
            <div className="ui-island-gathering-building__progress">
              <span style={{ width: `${String(progress)}%` }} />
            </div>
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

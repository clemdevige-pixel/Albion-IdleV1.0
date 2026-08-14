import { getIslandWorkerHouseLevelDefinition } from "@game/data";
import {
  PRODUCTION_FAMILY_IDS,
  getProductionFamilyDefinition,
} from "../../data/productionFamilyCatalog";
import { useGameBridge, useGameServices } from "../../state/GameContext";

export function WorkerHousePanel({ level }: { readonly level: number }): JSX.Element {
  const { workers } = useGameBridge();
  const { recruitWorker } = useGameServices();
  const levelDefinition = getIslandWorkerHouseLevelDefinition(level);

  return (
    <div className="ui-island-worker-house">
      <div className="ui-island-worker-house__stats">
        <div>
          <small>Ouvriers recrutés</small>
          <strong>{String(workers.workers.length)} / {String(levelDefinition.workerCapacity)}</strong>
        </div>
        <div>
          <small>Coût de recrutement</small>
          <strong>{String(levelDefinition.recruitmentCost)} Silver</strong>
        </div>
      </div>

      <div className="ui-island-worker-house__list">
        {workers.workers.length === 0 ? (
          <p className="ui-island-worker-house__empty">Aucun ouvrier recruté.</p>
        ) : workers.workers.map((worker) => (
          <article key={worker.id} className="ui-island-worker-house__worker">
            <div>
              <strong>{worker.displayName}</strong>
              <small>{worker.professionName} · Maîtrise {String(worker.mastery)}</small>
            </div>
            <span className={`is-${worker.state}`}>
              {worker.state === "working" ? "En production" : worker.state === "paused" ? "En pause" : "Disponible"}
            </span>
          </article>
        ))}
      </div>

      <section className="ui-island-worker-house__recruitment">
        <span className="ui-island__eyebrow">Recrutement</span>
        <div className="ui-island-worker-house__recruit-grid">
          {PRODUCTION_FAMILY_IDS.map((familyId) => {
            const family = getProductionFamilyDefinition(familyId);
            const recruited = workers.workers.some((worker) => worker.profession === family.profession);
            const capacityReached = workers.workers.length >= levelDefinition.workerCapacity;

            return (
              <button
                key={familyId}
                type="button"
                disabled={recruited || capacityReached}
                onClick={() => { recruitWorker(family.profession); }}
              >
                <img src={family.professionIcon} alt="" />
                <span>
                  <strong>{family.professionName}</strong>
                  <small>
                    {recruited
                      ? "Déjà recruté"
                      : capacityReached
                        ? "Capacité atteinte"
                        : `${String(levelDefinition.recruitmentCost)} S`}
                  </small>
                </span>
              </button>
            );
          })}
        </div>
      </section>

      <div className="ui-island__selection-status">
        Les affectations aux bâtiments de récolte seront raccordées dans l'étape suivante.
      </div>
    </div>
  );
}

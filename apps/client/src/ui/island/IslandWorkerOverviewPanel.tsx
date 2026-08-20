import { getIslandBuildingDefinition } from "@game/data";
import { useMemo } from "react";
import { getProductionFamilyDefinition } from "../../data/productionFamilyCatalog";
import { useGameBridge } from "../../state/GameContext";
import { findWorkerGatheringBuilding } from "../shared/findWorkerGatheringBuilding";
import { useIslandSelection } from "./IslandSelectionContext";
import "./islandWorkerOverview.css";

export function IslandWorkerOverviewPanel(): JSX.Element | null {
  const { island, workers } = useGameBridge();
  const { selectBuilding } = useIslandSelection();

  const workerRows = useMemo(() => workers.workers.map((worker) => {
    const building = findWorkerGatheringBuilding(island.buildings, worker.profession);
    const family = building === undefined
      ? undefined
      : getIslandBuildingDefinition(building.definitionId).gatheringService?.productionFamily;

    return {
      worker,
      building,
      family: family === undefined ? undefined : getProductionFamilyDefinition(family),
    };
  }), [island.buildings, workers.workers]);

  if (workerRows.length === 0) return null;

  return (
    <section className="ui-island-workers-overview">
      <div className="ui-island-workers-overview__heading">
        <div>
          <span className="ui-island__eyebrow">Ouvriers</span>
          <strong>Affectations de production</strong>
        </div>
        <span className="ui-island-workers-overview__count">{String(workerRows.length)}</span>
      </div>

      <div className="ui-island-workers-overview__list">
        {workerRows.map(({ worker, building, family }) => {
          const openBuilding = () => {
            if (building === undefined) return;
            selectBuilding(building.plotId, building.instanceId);
          };

          return (
            <div
              key={worker.id}
              className={`ui-island-workers-overview__row${building !== undefined ? " is-clickable" : ""}`}
              role={building !== undefined ? "button" : undefined}
              tabIndex={building !== undefined ? 0 : undefined}
              onClick={building !== undefined ? openBuilding : undefined}
              onKeyDown={building !== undefined ? (event) => {
                if (event.key === "Enter" || event.key === " ") {
                  event.preventDefault();
                  openBuilding();
                }
              } : undefined}
            >
              <span className="ui-island-workers-overview__avatar" aria-hidden="true">
                {family === undefined ? null : <img src={family.professionIcon} alt="" />}
              </span>

              <div className="ui-island-workers-overview__identity">
                <strong>{worker.displayName}</strong>
                <small>{worker.professionName}</small>
              </div>

              <div className="ui-island-workers-overview__tier">
                <small>Tier</small>
                <strong>T{String(worker.productionTier)}</strong>
              </div>

              <span className={`ui-island-workers-overview__state is-${worker.state}`}>
                <i />
                {worker.state === "working"
                  ? "En production"
                  : worker.state === "paused"
                    ? "En pause"
                    : "Disponible"}
              </span>

              {building !== undefined ? <span className="ui-island-workers-overview__open" aria-hidden="true">›</span> : null}
            </div>
          );
        })}
      </div>
    </section>
  );
}

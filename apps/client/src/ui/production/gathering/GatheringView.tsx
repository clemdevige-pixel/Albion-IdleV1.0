import { useState } from "react";
import { PRODUCTION_CONTENT_TIERS } from "../../../data/productionFamilyCatalog";
import { GatheringResourceCard } from "./GatheringResourceCard";
import type { GatheringResourceId } from "./gatheringModels";
import { useGatheringActions } from "./useGatheringActions";
import { useGatheringData } from "./useGatheringData";

export function GatheringView(): JSX.Element {
  const model = useGatheringData();
  const actions = useGatheringActions();
  const [selectedFamily, setSelectedFamily] = useState<GatheringResourceId>("wood");
  const resource = model.resources.find((entry) => entry.id === selectedFamily) ?? model.resources[0];

  return (
    <div className="ui-gathering">
      <div className="ui-gathering__toolbar">
        <div className="ui-gathering__tiers" role="group" aria-label="Palier de récolte">
          {PRODUCTION_CONTENT_TIERS.map((tier) => (
            <button key={tier} type="button" className={model.tier === tier ? "is-active" : ""} aria-pressed={model.tier === tier} onClick={() => { actions.setTier(tier); }}>
              T{String(tier)}
            </button>
          ))}
        </div>
        <span>Workers {String(model.recruitedWorkerCount)} / {String(model.workerCapacity)}</span>
      </div>

      <nav className="ui-gathering__families" aria-label="Familles de récolte">
        {model.resources.map((entry) => {
          const active = entry.activity.activeCycle !== undefined || entry.worker?.state === "working";
          return (
            <button
              key={entry.id}
              type="button"
              className={entry.id === resource?.id ? "is-active" : ""}
              aria-pressed={entry.id === resource?.id}
              onClick={() => { setSelectedFamily(entry.id); }}
            >
              <img src={`/assets/resources/${entry.icon}`} alt="" />
              <span>{entry.label}</span>
              {active && <i aria-label="Activité en cours" />}
            </button>
          );
        })}
      </nav>

      {resource !== undefined && (
        <GatheringResourceCard
          key={resource.id}
          resource={resource}
          tier={model.tier}
          recruitmentCost={model.recruitmentCost}
          actions={actions}
        />
      )}
    </div>
  );
}

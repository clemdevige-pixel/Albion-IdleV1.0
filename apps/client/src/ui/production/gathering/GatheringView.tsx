import { useState } from "react";
import { PRODUCTION_CONTENT_TIERS } from "../../../data/productionFamilyCatalog";
import { GatheringResourceCard } from "./GatheringResourceCard";
import type { GatheringResourceId } from "./gatheringModels";
import { useGatheringActions } from "./useGatheringActions";
import { useGatheringData } from "./useGatheringData";
import "../production.css";
import "./GatheringView.css";

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
        <span>Récolte active du héros</span>
      </div>

      {model.queued !== null && (
        <div className="ui-gathering__queued" role="status" aria-live="polite">
          <div>
            <strong>Récolte en attente du combat en cours</strong>
            <span>Elle commencera dès que l'ennemi actuel sera vaincu.</span>
          </div>
          <b>
            Rencontre {String(model.queued.encounterIndex)} / {String(model.queued.encounterCount)}
          </b>
        </div>
      )}

      <nav className="ui-gathering__families" aria-label="Familles de récolte">
        {model.resources.map((entry) => {
          const active = entry.activity.activeCycle !== undefined;
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
              {active && <i aria-label="Récolte active" />}
            </button>
          );
        })}
      </nav>

      {resource !== undefined && (
        <GatheringResourceCard
          key={resource.id}
          resource={resource}
          tier={model.tier}
          actions={actions}
        />
      )}
    </div>
  );
}

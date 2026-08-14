import {
  getIslandBuildingDefinition,
  type IslandBuildingId,
} from "@game/data";
import { PRODUCTION_CONTENT_TIERS } from "../../data/productionFamilyCatalog";
import { useRefiningActions } from "../production/refining/useRefiningActions";
import { useRefiningData } from "../production/refining/useRefiningData";
import "./refiningBuilding.css";

export function RefiningBuildingPanel({
  definitionId,
}: {
  readonly definitionId: IslandBuildingId;
}): JSX.Element {
  const definition = getIslandBuildingDefinition(definitionId);
  const service = definition.refiningService;
  if (service === undefined) {
    throw new Error(`Refining building ${definitionId} has no refining service data`);
  }

  const model = useRefiningData();
  const actions = useRefiningActions();
  const family = model.families.find((candidate) => candidate.id === service.productionFamily);
  if (family === undefined) {
    throw new Error(`Missing refining model for ${service.productionFamily}`);
  }

  const active = family.activity.status === "refining";

  return (
    <div className="ui-island-refining-building">
      <div className="ui-island-refining-building__tiers" role="group" aria-label="Tier de raffinage">
        {PRODUCTION_CONTENT_TIERS.map((tier) => (
          <button
            key={tier}
            type="button"
            className={model.tier === tier ? "is-active" : ""}
            onClick={() => { actions.setTier(tier); }}
          >
            T{String(tier)}
          </button>
        ))}
      </div>

      <div className="ui-island-refining-building__recipe">
        <img src={`/assets/resources/${family.refinedIcon}`} alt="" />
        <div>
          <small>Recette active</small>
          <strong>{family.activity.recipeName}</strong>
        </div>
        <span>{String(family.availableCycles)} cycles</span>
      </div>

      <div className="ui-island-refining-building__requirements">
        {family.requirements.map((requirement) => (
          <div key={requirement.itemId}>
            <img src={`/assets/resources/${requirement.icon}`} alt="" />
            <span>{requirement.label}</span>
            <b className={requirement.available >= requirement.quantity ? "is-ready" : "is-missing"}>
              {String(requirement.available)} / {String(requirement.quantity)}
            </b>
          </div>
        ))}
      </div>

      <div className="ui-island-refining-building__progress">
        <span style={{ width: `${String(Math.max(0, Math.min(100, family.activity.progress)))}%` }} />
      </div>

      <button
        className="ui-island-refining-building__action"
        type="button"
        disabled={!active && !family.canStart}
        onClick={() => { actions.toggle(family.id); }}
      >
        {active ? "Arrêter le raffinage" : family.canStart ? "Lancer le raffinage" : "Matériaux insuffisants"}
      </button>
    </div>
  );
}

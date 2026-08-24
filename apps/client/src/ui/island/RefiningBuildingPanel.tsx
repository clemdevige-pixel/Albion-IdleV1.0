import {
  getIslandBuildingDefinition,
  getIslandMaxProductionTier,
  type IslandBuildingId,
} from "@game/data";
import { useState } from "react";
import { REFINING_CONTENT_TIERS } from "../../data/productionFamilyCatalog";
import { getProductionRefiningRecipe } from "../../data/refiningRecipes";
import { useGameServices } from "../../state/GameContext";
import { useResourceTracking } from "../dashboard/ResourceTrackingContext";
import { useRefiningActions } from "../production/refining/useRefiningActions";
import { useRefiningData } from "../production/refining/useRefiningData";
import "./refiningBuilding.css";

export function RefiningBuildingPanel({
  definitionId,
  islandLevel,
}: {
  readonly definitionId: IslandBuildingId;
  readonly islandLevel: number;
}): JSX.Element {
  const model = useRefiningData();
  const actions = useRefiningActions();
  const { isInstantRefiningUnlocked } = useGameServices();
  const tracking = useResourceTracking();
  const [instantCycles, setInstantCycles] = useState<number | null>(null);

  const definition = getIslandBuildingDefinition(definitionId);
  const service = definition.refiningService;
  if (service === undefined) {
    throw new Error(`Refining building ${definitionId} has no refining service data`);
  }

  const maxTier = getIslandMaxProductionTier(islandLevel);
  if (maxTier === undefined) {
    throw new Error(`Island level ${String(islandLevel)} has no production tier data`);
  }

  const family = model.families.find((candidate) => candidate.id === service.productionFamily);
  if (family === undefined) {
    throw new Error(`Missing refining model for ${service.productionFamily}`);
  }

  const active = family.activity.status === "refining";
  const instantRefining = isInstantRefiningUnlocked();
  const recipe = getProductionRefiningRecipe(family.id, family.tier);
  const refinedIconSrc = `/assets/resources/${family.refinedIcon}`;
  const trackingId = `production:${family.id}:t${String(family.tier)}`;
  const tracked = tracking.isTracked(trackingId);
  const maxInstantCycles = Math.max(1, family.availableCycles);
  const selectedInstantCycles = instantCycles === null
    ? maxInstantCycles
    : Math.max(1, Math.min(maxInstantCycles, instantCycles));

  return (
    <div className="ui-island-refining-building">
      <div className="ui-island-refining-building__tiers" role="group" aria-label="Tier de raffinage">
        {REFINING_CONTENT_TIERS.map((tier) => {
          const islandLocked = tier > maxTier;
          return (
            <button
              key={tier}
              type="button"
              className={family.tier === tier ? "is-active" : ""}
              disabled={islandLocked || active}
              title={islandLocked ? `Améliorez l’île pour débloquer T${String(tier)}` : undefined}
              onClick={() => { actions.setTier(family.id, tier); }}
            >
              T{String(tier)}{islandLocked ? " 🔒" : ""}
            </button>
          );
        })}
      </div>

      <div className="ui-island-refining-building__recipe">
        <img src={refinedIconSrc} alt="" />
        <div>
          <small>Recette active</small>
          <strong>{family.activity.recipeName}</strong>
        </div>
        <span>{String(family.availableCycles)} cycles</span>
        <button
          type="button"
          aria-label={`${tracked ? "Ne plus suivre" : "Suivre"} ${family.label} T${String(family.tier)}`}
          title={tracked ? "Ne plus suivre dans la sidebar" : "Suivre brut + raffiné dans la sidebar"}
          onClick={() => {
            tracking.toggleTracked({
              id: trackingId,
              label: `${family.label} T${String(family.tier)}`,
              entries: [
                { itemId: recipe.rawItemId, label: "Brut", source: "production" },
                { itemId: recipe.outputItemId, label: "Raffiné", source: "production" },
              ],
            });
          }}
        >
          {tracked ? "★" : "☆"}
        </button>
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

      {instantRefining ? (
        <div className="ui-island-refining-building__batch">
          <label htmlFor={`refining-cycles-${family.id}`}>Cycles à raffiner</label>
          <input
            id={`refining-cycles-${family.id}`}
            type="number"
            min={1}
            max={maxInstantCycles}
            step={1}
            value={selectedInstantCycles}
            disabled={!family.canStart}
            onChange={(event) => {
              const value = Number(event.currentTarget.value);
              if (!Number.isFinite(value)) return;
              setInstantCycles(Math.max(1, Math.min(maxInstantCycles, Math.floor(value))));
            }}
          />
          <button
            type="button"
            disabled={!family.canStart}
            onClick={() => { setInstantCycles(null); }}
          >
            Max
          </button>
        </div>
      ) : null}

      <button
        className="ui-island-refining-building__action"
        type="button"
        disabled={!active && (!family.canStart || family.tier > maxTier)}
        onClick={() => {
          actions.toggle(family.id, instantRefining ? selectedInstantCycles : undefined);
        }}
      >
        {active
          ? "Arrêter le raffinage"
          : family.canStart
            ? instantRefining
              ? `Raffiner instantanément ×${String(selectedInstantCycles)}`
              : "Lancer le raffinage"
            : "Matériaux insuffisants"}
      </button>
    </div>
  );
}

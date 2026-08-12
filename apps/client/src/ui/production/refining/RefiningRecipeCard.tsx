import type { ProductionTier } from "../../../data/productionFamilyCatalog";
import type { RefiningActions } from "./useRefiningActions";
import type { RefiningFamilyModel } from "./refiningModels";

interface RefiningRecipeCardProps {
  readonly family: RefiningFamilyModel;
  readonly tier: ProductionTier;
  readonly actions: RefiningActions;
}

export function RefiningRecipeCard({ family, tier, actions }: RefiningRecipeCardProps): JSX.Element {
  const { activity } = family;
  const active = activity.status === "refining";

  return (
    <section className={`ui-refining-recipe${active ? " is-active" : ""}`}>
      <div className="ui-refining-recipe__conversion">
        <ResourceAmount icon={family.rawIcon} label={family.rawLabel} value={activity.rawStoredQuantity} />
        <span className="ui-refining-recipe__arrow" aria-hidden="true">→</span>
        <ResourceAmount icon={family.refinedIcon} label={activity.recipeName} value={activity.refinedStoredQuantity} />
      </div>

      <div className="ui-refining-recipe__meta">
        <span>Recette T{String(tier)}</span>
        <strong>{String(family.availableCycles)} cycle{family.availableCycles > 1 ? "s" : ""} possible{family.availableCycles > 1 ? "s" : ""}</strong>
      </div>

      <div className="ui-refining-recipe__requirements">
        {family.requirements.map((requirement) => {
          const met = requirement.available >= requirement.quantity;
          return (
            <div key={requirement.itemId} className={met ? "is-met" : "is-missing"}>
              <img src={`/assets/resources/${requirement.icon}`} alt="" />
              <span>{requirement.label}</span>
              <strong>{String(requirement.available)} / {String(requirement.quantity)}</strong>
            </div>
          );
        })}
        <div className="ui-refining-recipe__output"><span>Production</span><strong>1 unité / {String(activity.durationSeconds)} s</strong></div>
      </div>

      <ProgressBar value={activity.progress} />
      <div className="ui-refining-recipe__status">
        <span>{active ? `${String(activity.reservedInputQuantity)} entrée(s) réservée(s)` : "Raffinage continu jusqu’à épuisement"}</span>
        <b>{active ? "En cours" : family.canStart ? "Prêt" : "Ressources insuffisantes"}</b>
      </div>
      <button
        className={`ui-refining-recipe__action${active ? " is-stop" : ""}`}
        type="button"
        disabled={!active && !family.canStart}
        onClick={() => { actions.toggle(family.id); }}
      >
        {active ? "Arrêter le raffinage" : "Raffiner en continu"}
      </button>
    </section>
  );
}

function ResourceAmount(props: { readonly icon: string; readonly label: string; readonly value: number }): JSX.Element {
  return (
    <div className="ui-refining-resource">
      <img src={`/assets/resources/${props.icon}`} alt="" />
      <span>{props.label}</span>
      <strong>{String(props.value)}</strong>
    </div>
  );
}

function ProgressBar({ value }: { readonly value: number }): JSX.Element {
  const progress = Math.max(0, Math.min(100, value));
  return <div className="ui-refining-progress" aria-label={`${String(Math.round(progress))}%`}><span style={{ width: `${String(progress)}%` }} /></div>;
}

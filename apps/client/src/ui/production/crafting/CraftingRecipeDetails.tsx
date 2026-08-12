import type { CraftingRecipeVM, CraftingRequirementVM } from "../../../game/GameBridge";
import { ItemHoverTooltip } from "../../../panels/ItemHoverTooltip";
import {
  getItemDefinition,
  getItemDisplayName,
  ItemVisual,
} from "../../../panels/ItemVisual";

interface CraftingRecipeDetailsProps {
  readonly recipe: CraftingRecipeVM;
  readonly onCraft: () => void;
}

export function CraftingRecipeDetails({ recipe, onCraft }: CraftingRecipeDetailsProps): JSX.Element {
  const isConversion = recipe.family.startsWith("other_");
  const predecessorRequirements = isConversion
    ? []
    : recipe.requirements.filter((requirement) => isPredecessor(requirement, recipe.tier));
  const materialRequirements = isConversion
    ? recipe.requirements
    : recipe.requirements.filter((requirement) => !isPredecessor(requirement, recipe.tier));

  return (
    <section className="ui-crafting-detail" aria-labelledby="ui-crafting-recipe-title">
      <div className="ui-crafting-detail__result">
        <ItemHoverTooltip itemId={recipe.outputItemId} quantity={Math.max(1, recipe.craftedQuantity)}>
          <div className="ui-crafting-detail__visual"><ItemVisual itemId={recipe.outputItemId} /></div>
        </ItemHoverTooltip>
        <div className="ui-crafting-detail__identity">
          <span className="ui-production__eyebrow">{isConversion ? "Conversion" : "Objet sélectionné"}</span>
          <h3 id="ui-crafting-recipe-title">{recipe.recipeName}</h3>
          {isConversion ? (
            <p>Transforme les fragments accumulés en une ressource complète.</p>
          ) : (
            <dl>
              <div><dt>Tier</dt><dd>T{recipe.tier}</dd></div>
              <div><dt>Puissance d’objet</dt><dd>{recipe.itemPower} IP</dd></div>
            </dl>
          )}
          <p>Dans l’inventaire : {recipe.craftedQuantity}</p>
        </div>
      </div>

      <RequirementGroup title={isConversion ? "Fragments requis" : "Matériaux"} requirements={materialRequirements} />
      {predecessorRequirements.length > 0 && (
        <RequirementGroup title="Équipement prédécesseur" requirements={predecessorRequirements} predecessor />
      )}

      <button className="ui-production__primary-action" type="button" disabled={!recipe.canCraft} onClick={onCraft}>
        {recipe.canCraft ? (isConversion ? "Transformer" : "Fabriquer") : getBlockedLabel(recipe.blockedReason)}
      </button>
    </section>
  );
}

function RequirementGroup({ title, requirements, predecessor = false }: { readonly title: string; readonly requirements: readonly CraftingRequirementVM[]; readonly predecessor?: boolean }): JSX.Element {
  return (
    <div className={`ui-crafting-detail__requirements${predecessor ? " is-predecessor" : ""}`}>
      <h4>{title} <span>Possédé / Requis</span></h4>
      {requirements.map((requirement) => {
        const available = requirement.available >= requirement.quantity;
        const definition = getItemDefinition(requirement.itemId);
        const displayName = getItemDisplayName(requirement.itemId);
        return (
          <div className={`ui-crafting-requirement${available ? " is-ready" : " is-missing"}`} key={requirement.itemId}>
            {definition !== undefined ? (
              <ItemHoverTooltip itemId={requirement.itemId} quantity={requirement.available}>
                <span className="ui-crafting-requirement__item">
                  <span className="ui-crafting-requirement__icon"><ItemVisual itemId={requirement.itemId} /></span>
                  <span className="ui-crafting-requirement__name">{displayName}<small>T{definition.tier}</small></span>
                </span>
              </ItemHoverTooltip>
            ) : (
              <>
                <span className="ui-crafting-requirement__icon"><ItemVisual itemId={requirement.itemId} /></span>
                <span className="ui-crafting-requirement__name">{displayName}</span>
              </>
            )}
            <strong>{requirement.available} / {requirement.quantity}</strong>
          </div>
        );
      })}
    </div>
  );
}

function isPredecessor(requirement: CraftingRequirementVM, recipeTier: number): boolean {
  return getItemDefinition(requirement.itemId)?.tier === recipeTier - 1;
}

function getBlockedLabel(reason: CraftingRecipeVM["blockedReason"]): string {
  if (reason === "missing_predecessor") return "Prédécesseur manquant";
  if (reason === "inventory_full") return "Inventaire plein";
  return "Matériaux manquants";
}

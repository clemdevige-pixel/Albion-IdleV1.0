import type { CraftingRecipeVM, CraftingRequirementVM } from "../../../game/GameBridge";
import { getItemDefinition, ItemVisual } from "../../../panels/ItemVisual";

interface CraftingRecipeDetailsProps {
  readonly recipe: CraftingRecipeVM;
  readonly onCraft: () => void;
}

export function CraftingRecipeDetails({ recipe, onCraft }: CraftingRecipeDetailsProps): JSX.Element {
  const predecessorRequirements = recipe.requirements.filter((requirement) => isPredecessor(requirement, recipe.tier));
  const materialRequirements = recipe.requirements.filter((requirement) => !isPredecessor(requirement, recipe.tier));

  return (
    <section className="ui-crafting-detail" aria-labelledby="ui-crafting-recipe-title">
      <div className="ui-crafting-detail__result">
        <div className="ui-crafting-detail__visual"><ItemVisual itemId={recipe.outputItemId} /></div>
        <div className="ui-crafting-detail__identity">
          <span className="ui-production__eyebrow">Objet sélectionné</span>
          <h3 id="ui-crafting-recipe-title">{recipe.recipeName}</h3>
          <dl>
            <div><dt>Tier</dt><dd>T{recipe.tier}</dd></div>
            <div><dt>Puissance d’objet</dt><dd>{recipe.itemPower} IP</dd></div>
          </dl>
          <p>Dans l’inventaire : {recipe.craftedQuantity}</p>
        </div>
      </div>

      <RequirementGroup title="Matériaux" requirements={materialRequirements} />
      {predecessorRequirements.length > 0 && (
        <RequirementGroup title="Équipement prédécesseur" requirements={predecessorRequirements} predecessor />
      )}

      <button className="ui-production__primary-action" type="button" disabled={!recipe.canCraft} onClick={onCraft}>
        {recipe.canCraft ? "Fabriquer" : getBlockedLabel(recipe.blockedReason)}
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
        const presentation = getRequirementPresentation(requirement.itemId);
        return (
          <div className={`ui-crafting-requirement${available ? " is-ready" : " is-missing"}`} key={requirement.itemId}>
            <span className="ui-crafting-requirement__icon"><img src={presentation.iconPath} alt="" /></span>
            <span className="ui-crafting-requirement__name">{presentation.label}<small>T{presentation.tier}</small></span>
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

function getRequirementPresentation(itemId: string): { readonly label: string; readonly iconPath: string; readonly tier: string } {
  const item = getItemDefinition(itemId);
  if (item !== undefined) return { label: item.name, iconPath: `/assets/items/${item.icon}`, tier: String(item.tier) };

  const tier = itemId.match(/_t(\d+)(?:_|$)/i)?.[1] ?? "?";
  if (itemId.includes("planks")) return { label: "Planches", iconPath: "/assets/resources/resource-birch-planks.png", tier };
  if (itemId.includes("bar")) return { label: "Lingots", iconPath: "/assets/resources/resource-copper-ingot.png", tier };
  if (itemId.includes("leather")) return { label: "Cuir", iconPath: "/assets/resources/resource-leather.png", tier };
  if (itemId.includes("cloth")) return { label: "Tissu", iconPath: "/assets/resources/resource-cloth.png", tier };
  return { label: itemId.replace("item_", "").replace(/_/g, " "), iconPath: "/assets/resources/resource-birch-log.png", tier };
}

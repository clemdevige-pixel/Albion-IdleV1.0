import { useState } from "react";
import { PRODUCTION_CONTENT_TIERS } from "../../../data/productionFamilyCatalog";
import type { CraftingCategoryId, CraftingFamilyId } from "./craftingModels";
import { CraftingRecipeDetails } from "./CraftingRecipeDetails";
import { useCraftingActions } from "./useCraftingActions";
import { useCraftingData } from "./useCraftingData";
import "./crafting.css";

export function CraftingView(): JSX.Element {
  const model = useCraftingData();
  const actions = useCraftingActions();
  const [requestedCategory, setRequestedCategory] = useState<CraftingCategoryId | undefined>();
  const [requestedFamily, setRequestedFamily] = useState<CraftingFamilyId | undefined>();
  const [requestedRecipeId, setRequestedRecipeId] = useState<string | undefined>();

  const category = model.categories.find((entry) => entry.id === requestedCategory) ?? model.categories[0];
  const family = category?.families.find((entry) => entry.id === requestedFamily) ?? category?.families[0];
  const recipe = family?.recipes.find((entry) => entry.outputItemId === requestedRecipeId) ?? family?.recipes[0];
  const isTierIndependentCategory = category?.id === "other";

  const selectCategory = (categoryId: CraftingCategoryId): void => {
    setRequestedCategory(categoryId);
    setRequestedFamily(undefined);
    setRequestedRecipeId(undefined);
  };

  return (
    <div className="ui-production-view ui-crafting">
      <header className="ui-production-view__header">
        <div><span className="ui-production__eyebrow">Forge</span><h2>Fabrication</h2></div>
        {!isTierIndependentCategory && (
          <div className="ui-production__tier-selector" aria-label="Tier de fabrication">
            {PRODUCTION_CONTENT_TIERS.map((tier) => (
              <button type="button" key={tier} className={model.tier === tier ? "is-active" : ""} aria-pressed={model.tier === tier} onClick={() => { actions.setTier(tier); }}>
                T{tier}
              </button>
            ))}
          </div>
        )}
      </header>

      <nav className="ui-crafting__categories" aria-label="Catégorie d’équipement">
        {model.categories.map((entry) => (
          <button type="button" key={entry.id} className={entry.id === category?.id ? "is-active" : ""} onClick={() => { selectCategory(entry.id); }}>
            {entry.label}
          </button>
        ))}
      </nav>

      {category === undefined || family === undefined || recipe === undefined ? (
        <p className="ui-production__empty">{isTierIndependentCategory ? "Aucune conversion disponible." : "Aucune recette disponible pour ce tier."}</p>
      ) : (
        <>
          <div className="ui-crafting__selectors">
            <label>
              <span>Famille</span>
              <select value={family.id} onChange={(event) => { setRequestedFamily(event.target.value); setRequestedRecipeId(undefined); }}>
                {category.families.map((entry) => <option key={entry.id} value={entry.id}>{entry.label}</option>)}
              </select>
            </label>
            <label>
              <span>Objet</span>
              <select value={recipe.outputItemId} onChange={(event) => { setRequestedRecipeId(event.target.value); }}>
                {family.recipes.map((entry) => <option key={entry.outputItemId} value={entry.outputItemId}>{entry.recipeName}</option>)}
              </select>
            </label>
          </div>
          <CraftingRecipeDetails recipe={recipe} onCraft={() => { actions.craft(recipe.outputItemId); }} />
        </>
      )}
    </div>
  );
}

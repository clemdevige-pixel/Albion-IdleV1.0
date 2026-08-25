import { useState } from "react";
import { CRAFTING_CONTENT_TIERS } from "../../../data/productionFamilyCatalog";
import type { CraftingCategoryId, CraftingFamilyId } from "./craftingModels";
import { CraftingRecipeDetails } from "./CraftingRecipeDetails";
import { CraftingSelect } from "./CraftingSelect";
import { useCraftingActions } from "./useCraftingActions";
import { useCraftingData } from "./useCraftingData";
import "./crafting.css";

export function CraftingView(): JSX.Element {
  const model = useCraftingData();
  const actions = useCraftingActions();
  const [requestedCategory, setRequestedCategory] = useState<CraftingCategoryId | undefined>();
  const [requestedFamily, setRequestedFamily] = useState<CraftingFamilyId | undefined>();
  const [requestedRecipeKey, setRequestedRecipeKey] = useState<string | undefined>();

  const category = model.categories.find((entry) => entry.id === requestedCategory) ?? model.categories[0];
  const family = category?.families.find((entry) => entry.id === requestedFamily) ?? category?.families[0];
  const recipe = family?.recipes.find((entry) => entry.selectionKey === requestedRecipeKey) ?? family?.recipes[0];
  const isTierIndependentCategory = category?.id === "other";

  const selectCategory = (categoryId: CraftingCategoryId): void => {
    setRequestedCategory(categoryId);
    setRequestedFamily(undefined);
    setRequestedRecipeKey(undefined);
  };

  return (
    <div className="ui-production-view ui-crafting">
      <header className="ui-production-view__header">
        <div><span className="ui-production__eyebrow">Forge</span><h2>Fabrication</h2></div>
        {!isTierIndependentCategory && (
          <div className="ui-production__tier-selector" aria-label="Tier de fabrication">
            {CRAFTING_CONTENT_TIERS.map((tier) => (
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
            <CraftingSelect
              label="Famille"
              value={family.id}
              options={category.families.map((entry) => ({ value: entry.id, label: entry.label }))}
              onChange={(familyId) => {
                setRequestedFamily(familyId);
                setRequestedRecipeKey(undefined);
              }}
            />
            <CraftingSelect
              label="Objet"
              value={recipe.selectionKey}
              options={family.recipes.map((entry) => ({ value: entry.selectionKey, label: entry.recipeName }))}
              onChange={setRequestedRecipeKey}
            />
          </div>
          <CraftingRecipeDetails recipe={recipe} onCraft={() => actions.craft(recipe.outputItemId)} />
        </>
      )}
    </div>
  );
}

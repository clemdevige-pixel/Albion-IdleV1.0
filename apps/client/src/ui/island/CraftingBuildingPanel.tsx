import { useState } from "react";
import {
  getIslandBuildingDefinition,
  getIslandBuildingMaxProductionTier,
  type IslandBuildingId,
} from "@game/data";
import { CRAFTING_CONTENT_TIERS } from "../../data/productionFamilyCatalog";
import type {
  CraftingCategoryId,
  CraftingFamilyId,
} from "../production/crafting/craftingModels";
import { CraftingRecipeDetails } from "../production/crafting/CraftingRecipeDetails";
import { CraftingSelect } from "../production/crafting/CraftingSelect";
import { useCraftingActions } from "../production/crafting/useCraftingActions";
import { useCraftingData } from "../production/crafting/useCraftingData";
import "../production/crafting/crafting.css";
import "./craftingBuilding.css";

export function CraftingBuildingPanel({
  definitionId,
  level,
}: {
  readonly definitionId: IslandBuildingId;
  readonly level: number;
}): JSX.Element {
  const definition = getIslandBuildingDefinition(definitionId);
  const service = definition.craftingService;
  if (service === undefined) {
    throw new Error(`Crafting building ${definitionId} has no crafting service data`);
  }

  const maxTier = getIslandBuildingMaxProductionTier(definitionId, level);
  if (maxTier === undefined) {
    throw new Error(`Crafting building ${definitionId} level ${String(level)} has no progression data`);
  }

  const model = useCraftingData();
  const actions = useCraftingActions();
  const categories = model.categories.filter((category) => (
    service.categories.includes(category.id)
  ));
  const [requestedCategory, setRequestedCategory] = useState<CraftingCategoryId | undefined>();
  const [requestedFamily, setRequestedFamily] = useState<CraftingFamilyId | undefined>();
  const [requestedRecipeId, setRequestedRecipeId] = useState<string | undefined>();

  const category = categories.find((entry) => entry.id === requestedCategory) ?? categories[0];
  const family = category?.families.find((entry) => entry.id === requestedFamily) ?? category?.families[0];
  const recipe = family?.recipes.find((entry) => entry.outputItemId === requestedRecipeId) ?? family?.recipes[0];
  const tierIndependent = category?.id === "other";

  return (
    <div className="ui-island-crafting-building">
      {!tierIndependent && (
        <div className="ui-island-crafting-building__tiers" role="group" aria-label="Tier de fabrication">
          {CRAFTING_CONTENT_TIERS.map((tier) => {
            const buildingLocked = tier > maxTier;
            return (
              <button
                key={tier}
                type="button"
                className={model.tier === tier ? "is-active" : ""}
                disabled={buildingLocked}
                title={buildingLocked ? `Améliorez l’atelier pour débloquer T${String(tier)}` : undefined}
                onClick={() => {
                  actions.setTier(tier);
                  setRequestedRecipeId(undefined);
                }}
              >
                T{String(tier)}{buildingLocked ? " 🔒" : ""}
              </button>
            );
          })}
        </div>
      )}

      <nav className="ui-island-crafting-building__categories" aria-label="Catégorie de fabrication">
        {categories.map((entry) => (
          <button
            key={entry.id}
            type="button"
            className={entry.id === category?.id ? "is-active" : ""}
            onClick={() => {
              setRequestedCategory(entry.id);
              setRequestedFamily(undefined);
              setRequestedRecipeId(undefined);
            }}
          >
            {entry.label}
          </button>
        ))}
      </nav>

      {category === undefined || family === undefined || recipe === undefined ? (
        <div className="ui-island__selection-status">Aucune recette disponible pour cette sélection.</div>
      ) : model.tier > maxTier && !tierIndependent ? (
        <div className="ui-island__selection-status">
          Atelier niveau {String(level)} : fabrication limitée au T{String(maxTier)}.
        </div>
      ) : (
        <>
          <div className="ui-island-crafting-building__selectors">
            <CraftingSelect
              label="Famille"
              value={family.id}
              options={category.families.map((entry) => ({ value: entry.id, label: entry.label }))}
              onChange={(familyId) => {
                setRequestedFamily(familyId);
                setRequestedRecipeId(undefined);
              }}
            />
            <CraftingSelect
              label="Objet"
              value={recipe.outputItemId}
              options={family.recipes.map((entry) => ({ value: entry.outputItemId, label: entry.recipeName }))}
              onChange={setRequestedRecipeId}
            />
          </div>
          <CraftingRecipeDetails
            recipe={recipe}
            onCraft={() => { actions.craft(recipe.outputItemId); }}
          />
        </>
      )}
    </div>
  );
}

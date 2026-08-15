import { getIslandBuildingDefinition, type IslandBuildingId } from "@game/data";
import { useGameBridge } from "../../state/GameContext";
import { getIslandMaterialLabel } from "./islandMaterialPresentation";

const GATHERING_BUILDING_IDS: readonly IslandBuildingId[] = [
  "lumber_camp",
  "mine",
  "hunting_camp",
  "fiber_camp",
];

/**
 * Lightweight onboarding derived entirely from authoritative game state.
 * No tutorial flags are stored: guidance disappears naturally once the player
 * owns a first crafted T3 armor/offhand piece beyond the starter weapon.
 */
export function IslandOnboardingGuide(): JSX.Element | null {
  const { island, crafting, workers } = useGameBridge();
  const builtIds = new Set(island.buildings.map((building) => building.definitionId));
  const workshopBuilt = builtIds.has("workshop");
  const gatheringBuildings = GATHERING_BUILDING_IDS.filter((id) => builtIds.has(id));

  const t3FirstGearRecipes = crafting.recipes.filter((recipe) => (
    recipe.tier === 3 && (recipe.family === "armor" || recipe.family === "offhand")
  ));
  const hasFirstCraftedGear = t3FirstGearRecipes.some((recipe) => recipe.craftedQuantity > 0);

  if (hasFirstCraftedGear) return null;

  return (
    <section className="ui-island__selection">
      <div>
        <span className="ui-island__eyebrow">Premiers pas T3</span>
        <strong>Préparez votre premier équipement</strong>
      </div>
      <p>
        Consultez d’abord les besoins de l’objet qui vous intéresse : vous n’avez pas besoin de construire
        toutes les filières immédiatement. Une filière ciblée et un premier ouvrier suffisent pour découvrir la boucle.
      </p>

      {t3FirstGearRecipes.length > 0 && (
        <div className="ui-island-construction__list">
          {t3FirstGearRecipes.map((recipe) => (
            <article key={recipe.outputItemId} className="ui-island-construction__card">
              <header>
                <div>
                  <strong>{recipe.recipeName}</strong>
                  <small>
                    {recipe.requirements.map((requirement) => (
                      `${String(requirement.quantity)} ${getIslandMaterialLabel(requirement.itemId)}`
                    )).join(" · ")}
                  </small>
                </div>
              </header>
            </article>
          ))}
        </div>
      )}

      {gatheringBuildings.length === 0 ? (
        <div className="ui-island__selection-status">
          1. Choisissez un premier bâtiment de récolte correspondant aux matériaux de votre recette.
        </div>
      ) : workers.workers.length === 0 ? (
        <div className="ui-island__selection-status">
          2. Recrutez l’ouvrier correspondant depuis la Maison des ouvriers. Un seul ouvrier suffit pour démarrer : vous pourrez développer les autres métiers plus tard.
        </div>
      ) : !workshopBuilt ? (
        <div className="ui-island__selection-status">
          3. Lancez le worker depuis son bâtiment, récoltez activement en parallèle, puis raffinez les matériaux nécessaires avant de construire l’Atelier d’équipement.
        </div>
      ) : (
        <div className="ui-island__selection-status">
          4. Votre Atelier est prêt : terminez le raffinage puis fabriquez votre première pièce T3 pour reprendre la progression de combat.
        </div>
      )}

      {gatheringBuildings.length > 0 && (
        <div className="ui-island__selection-status">
          Rappel : le worker récolte automatiquement et le gather actif du héros s’ajoute à sa production.
        </div>
      )}

      {gatheringBuildings.map((buildingId) => {
        const definition = getIslandBuildingDefinition(buildingId);
        const profession = definition.gatheringService?.workerProfession;
        if (profession === undefined) return null;
        const worker = workers.workers.find((candidate) => candidate.profession === profession);
        if (worker === undefined) return null;
        return (
          <div key={buildingId} className="ui-island__selection-status">
            {definition.label} : {worker.displayName} est {worker.state === "working" ? "en production" : "prêt à être affecté"}.
          </div>
        );
      })}
    </section>
  );
}

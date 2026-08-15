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
 * No tutorial flags are stored: guidance disappears naturally as the player
 * builds the production chain.
 */
export function IslandOnboardingGuide(): JSX.Element | null {
  const { island, crafting, workers } = useGameBridge();
  const builtIds = new Set(island.buildings.map((building) => building.definitionId));
  const workshopBuilt = builtIds.has("workshop");
  const gatheringBuildings = GATHERING_BUILDING_IDS.filter((id) => builtIds.has(id));

  if (workshopBuilt) return null;

  const t3ArmorRecipes = crafting.recipes.filter((recipe) => (
    recipe.tier === 3 && recipe.family === "armor"
  ));

  return (
    <section className="ui-island__selection">
      <div>
        <span className="ui-island__eyebrow">Premiers pas T3</span>
        <strong>Préparez votre premier équipement</strong>
      </div>
      <p>
        Consultez d’abord les besoins de l’objet qui vous intéresse : vous n’avez pas besoin de construire
        toutes les filières immédiatement.
      </p>

      {t3ArmorRecipes.length > 0 && (
        <div className="ui-island-construction__list">
          {t3ArmorRecipes.map((recipe) => (
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
          Choisissez ensuite un premier bâtiment de récolte correspondant aux matériaux de votre recette.
        </div>
      ) : (
        <div className="ui-island__selection-status">
          Premier bâtiment de récolte construit : recrutez l’ouvrier correspondant depuis la Maison des ouvriers,
          puis lancez sa production depuis le bâtiment. Le héros peut récolter activement en parallèle pour accélérer la production.
        </div>
      )}

      {gatheringBuildings.length > 0 && workers.workers.length === 0 && (
        <div className="ui-island__selection-status">
          Astuce : un ouvrier automatise la récolte, mais ne remplace pas le gather actif du héros — les deux se cumulent.
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

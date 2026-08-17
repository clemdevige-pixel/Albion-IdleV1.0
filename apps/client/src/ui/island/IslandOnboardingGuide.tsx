import type { IslandBuildingId } from "@game/data";
import { ItemHoverTooltip } from "../../panels/ItemHoverTooltip";
import { getItemDefinition, ItemVisual } from "../../panels/ItemVisual";
import { useGameBridge } from "../../state/GameContext";
import { getIslandMaterialLabel } from "./islandMaterialPresentation";

const GATHERING_BUILDING_IDS: readonly IslandBuildingId[] = [
  "lumber_camp",
  "mine",
  "hunting_camp",
  "fiber_camp",
];

const FIRST_GEAR_SLOTS = new Set(["head", "torso", "boots", "off_hand"]);

/**
 * Lightweight onboarding derived entirely from persisted authoritative state.
 * Possessing a first armor/offhand item permanently advances the guide even
 * after reload; no volatile crafting-session counter is used as a tutorial flag.
 */
export function IslandOnboardingGuide(): JSX.Element | null {
  const { island, crafting, workers, equipment, inventory, bank } = useGameBridge();
  const builtIds = new Set(island.buildings.map((building) => building.definitionId));
  const workshopBuilt = builtIds.has("workshop");
  const gatheringBuildings = GATHERING_BUILDING_IDS.filter((id) => builtIds.has(id));
  const equippedWeaponId = equipment.slots.find((slot) => slot.slot === "weapon")?.itemId;
  const equippedWeapon = equippedWeaponId === undefined ? undefined : getItemDefinition(equippedWeaponId);
  const usesTwoHandedWeapon = equippedWeapon?.handling === "two_handed";

  const t3FirstGearRecipes = crafting.recipes.filter((recipe) => (
    recipe.tier === 3
    && (recipe.family === "armor" || recipe.family === "offhand")
    && !(usesTwoHandedWeapon && recipe.family === "offhand")
  ));
  const ownedItemIds = [
    ...equipment.slots.map((slot) => slot.itemId),
    ...inventory.slots.map((slot) => slot.itemId),
    ...bank.slots.map((slot) => slot.itemId),
  ].filter((itemId): itemId is string => itemId !== undefined);
  const hasFirstCraftedGear = ownedItemIds.some((itemId) => {
    const definition = getItemDefinition(itemId);
    return definition !== undefined
      && definition.tier >= 3
      && definition.slot !== undefined
      && FIRST_GEAR_SLOTS.has(definition.slot);
  });

  if (hasFirstCraftedGear) return null;

  const objective = gatheringBuildings.length === 0
    ? "1. Choisissez un bâtiment de récolte correspondant aux matériaux de votre recette."
    : workers.workers.length === 0
      ? "2. Recrutez l’ouvrier correspondant depuis la Maison des ouvriers."
      : !workshopBuilt
        ? "3. Lancez le worker, récoltez en parallèle puis raffinez avant de construire l’Atelier."
        : "4. Terminez le raffinage puis fabriquez votre première pièce T3.";

  return (
    <section className="ui-island__selection ui-island-onboarding">
      <div className="ui-island-onboarding__heading">
        <span className="ui-island__eyebrow">Premiers pas T3</span>
        <strong>Préparez votre premier équipement</strong>
      </div>
      <p className="ui-island-onboarding__description">
        Consultez les besoins de l’objet visé : une filière ciblée et un premier ouvrier suffisent pour démarrer.
      </p>

      {t3FirstGearRecipes.length > 0 && (
        <div className="ui-island-construction__list ui-island-onboarding__recipes">
          {t3FirstGearRecipes.map((recipe) => (
            <article key={recipe.outputItemId} className="ui-island-construction__card ui-island-onboarding__recipe-card">
              <header>
                <ItemHoverTooltip itemId={recipe.outputItemId}>
                  <span className="ui-island-onboarding__item-icon" aria-label={`Détails de ${recipe.recipeName}`}>
                    <ItemVisual itemId={recipe.outputItemId} />
                  </span>
                </ItemHoverTooltip>
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

      <div className="ui-island-onboarding__objective">
        <span aria-hidden="true">◆</span>
        <span>{objective}</span>
      </div>

      {gatheringBuildings.length > 0 && (
        <small className="ui-island-onboarding__reminder">
          Le worker récolte automatiquement ; la récolte active du héros s’ajoute à sa production.
        </small>
      )}
    </section>
  );
}

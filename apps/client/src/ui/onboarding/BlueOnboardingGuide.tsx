import { useMemo, useState } from "react";
import { useAuthSession } from "../../auth/AuthSessionContext.js";
import { isArtifactWeaponCraftOutput } from "../../data/artifactWeaponCraftRecipes.js";
import { useGameBridge, useGameServices } from "../../state/GameContext";
import { useSaveSlotSession } from "../../state/SaveSlotSessionContext.js";
import { resolveBlueOnboardingStep } from "./blueOnboardingModel.js";
import "./onboarding.css";

const ARTIFACT_INTRO_STORAGE_PREFIX = "albion-idle:onboarding:artifact-intro:";

function artifactIntroStorageKey(accountId: string, slotId: string): string {
  return `${ARTIFACT_INTRO_STORAGE_PREFIX}${accountId}:${slotId}`;
}

function readArtifactIntroDismissed(storageKey: string): boolean {
  if (typeof window === "undefined") return false;
  return window.localStorage.getItem(storageKey) === "1";
}

export function BlueOnboardingGuide(): JSX.Element | null {
  const bridge = useGameBridge();
  const services = useGameServices();
  const { account } = useAuthSession();
  const { activeSlotId } = useSaveSlotSession();
  const storageKey = artifactIntroStorageKey(account.id, activeSlotId);
  const [artifactIntroDismissed, setArtifactIntroDismissed] = useState(
    () => readArtifactIntroDismissed(storageKey),
  );

  const step = useMemo(() => {
    const academy = services.getAcademyModel();
    const dungeon = services.getDungeonState();
    const buildingIds = new Set(bridge.island.buildings.map((building) => building.definitionId));
    const workerStarted = bridge.workers.workers.some((worker) => (
      worker.state === "working" || worker.mastery > 0 || worker.masteryXp > 0
    ));
    const t3ArmorIds = new Set(
      bridge.crafting.recipes
        .filter((recipe) => recipe.tier === 3 && recipe.family === "armor")
        .map((recipe) => recipe.outputItemId),
    );
    const ownedItemIds = [
      ...bridge.equipment.slots.map((slot) => slot.itemId),
      ...bridge.inventory.slots.map((slot) => slot.itemId),
      ...bridge.bank.slots.map((slot) => slot.itemId),
    ].filter((itemId): itemId is string => itemId !== undefined);

    return resolveBlueOnboardingStep({
      buildingIds,
      workerStarted,
      hasT3Armor: ownedItemIds.some((itemId) => t3ArmorIds.has(itemId)),
      academyResearch: academy.research,
      dungeonUnlocked: services.isDungeonSystemUnlocked(),
      clearedDungeonTiers: dungeon.clearedTiers,
      artifactWeaponOwned: ownedItemIds.some(isArtifactWeaponCraftOutput),
      artifactIntroDismissed,
    });
  }, [artifactIntroDismissed, bridge, services]);

  if (step === null) return null;

  const dismissArtifactIntro = (): void => {
    if (step.id !== "artifact_intro") return;
    if (typeof window !== "undefined") {
      window.localStorage.setItem(storageKey, "1");
    }
    setArtifactIntroDismissed(true);
  };

  return (
    <section className="ui-onboarding-guide" aria-label="Guide des premiers pas">
      <div className="ui-onboarding-guide__heading">
        <div>
          <span>{step.eyebrow}</span>
          <strong>{step.title}</strong>
        </div>
        {step.informational === true && (
          <button type="button" onClick={dismissArtifactIntro}>J’ai compris</button>
        )}
      </div>
      <p>{step.description}</p>
      <small><span aria-hidden="true">◆</span>{step.hint}</small>
      <em>Suggestion uniquement : vous restez libre de jouer et progresser dans l’ordre de votre choix.</em>
    </section>
  );
}

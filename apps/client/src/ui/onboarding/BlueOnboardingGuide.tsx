import { useMemo, useState } from "react";
import { useAuthSession } from "../../auth/AuthSessionContext.js";
import { isArtifactWeaponCraftOutput } from "../../data/artifactWeaponCraftRecipes.js";
import { getItemTier } from "../../data/itemPower.js";
import { resolveProgressionEquipmentRoute } from "../../data/nonWeaponEquipmentContentCatalog.js";
import { DUNGEON_RELIC_ID } from "../../data/relicContentCatalog.js";
import { WORLD_ZONE_IDS } from "../../data/worldContentCatalog.js";
import { useGameBridge, useGameServices } from "../../state/GameContext";
import { useSaveSlotSession } from "../../state/SaveSlotSessionContext.js";
import {
  resolveBlueOnboardingStep,
  type BlueOnboardingArtifactStage,
} from "./blueOnboardingModel.js";
import "./onboarding.css";

const ARTIFACT_INTRO_STORAGE_PREFIX = "albion-idle:onboarding:artifact-intro:";

function artifactIntroStorageKey(accountId: string, slotId: string): string {
  return `${ARTIFACT_INTRO_STORAGE_PREFIX}${accountId}:${slotId}`;
}

function readArtifactStage(storageKey: string): BlueOnboardingArtifactStage {
  if (typeof window === "undefined") return "artifacts";
  const value = window.localStorage.getItem(storageKey);
  if (value === "artifact_weapons" || value === "done") return value;
  if (value === "1") return "done";
  return "artifacts";
}

function isChestProgressionItem(itemId: string): boolean {
  const route = resolveProgressionEquipmentRoute(itemId);
  return route !== undefined && route.family.slot === "chest" && route.item.tier >= 3;
}

function isTier4OrHigher(itemId: string | undefined): boolean {
  if (itemId === undefined) return false;
  const tier = getItemTier(itemId);
  return tier !== undefined && tier >= 4;
}

export function BlueOnboardingGuide(): JSX.Element | null {
  const bridge = useGameBridge();
  const services = useGameServices();
  const { account } = useAuthSession();
  const { activeSlotId } = useSaveSlotSession();
  const storageKey = artifactIntroStorageKey(account.id, activeSlotId);
  const [artifactStage, setArtifactStage] = useState<BlueOnboardingArtifactStage>(
    () => readArtifactStage(storageKey),
  );

  const step = useMemo(() => {
    const academy = services.getAcademyModel();
    const dungeon = services.getDungeonState();
    const relic = services.getRelicProgress(DUNGEON_RELIC_ID);
    const buildingIds = new Set(bridge.island.buildings.map((building) => building.definitionId));
    const workerStarted = bridge.workers.workers.some((worker) => (
      worker.state === "working" || worker.mastery > 0 || worker.masteryXp > 0
    ));
    const ownedItemIds = [
      ...bridge.equipment.slots.map((slot) => slot.itemId),
      ...bridge.inventory.slots.map((slot) => slot.itemId),
      ...bridge.bank.slots.map((slot) => slot.itemId),
    ].filter((itemId): itemId is string => itemId !== undefined);
    const frostpeak = bridge.world.zones.find((zone) => zone.zoneDefId === WORLD_ZONE_IDS.mountain);
    const hasReachedFrostpeak = frostpeak?.isUnlocked === true
      || frostpeak?.isActive === true
      || (frostpeak?.completedSegments.length ?? 0) > 0;
    const hasProgressedBeyondEarlyProduction = bridge.world.zones.some((zone) => (
      zone.worldBandId === "blue"
      && zone.zoneIndexWithinBand >= 3
      && zone.isUnlocked
    ));
    const beyondBlueOnboarding = dungeon.clearedTiers.some((tier) => tier > 4);

    return resolveBlueOnboardingStep({
      buildingIds,
      workerStarted,
      hasChestArmorTier3OrHigher: ownedItemIds.some(isChestProgressionItem),
      hasEquippedTier4OrHigher: bridge.equipment.slots.some((slot) => isTier4OrHigher(slot.itemId)),
      hasProgressedBeyondEarlyProduction,
      academyResearch: academy.research,
      hasReachedFrostpeak,
      relicState: relic?.state ?? "unobtained",
      relicChargeKills: relic?.chargeKills ?? 0,
      relicRequiredChargeKills: relic?.requiredChargeKills ?? 0,
      dungeonUnlocked: services.isDungeonSystemUnlocked(),
      activeDungeon: dungeon.activeRun !== undefined,
      clearedDungeonTiers: dungeon.clearedTiers,
      artifactWeaponOwned: ownedItemIds.some(isArtifactWeaponCraftOutput),
      artifactStage,
      beyondBlueOnboarding,
    });
  }, [artifactStage, bridge, services]);

  if (step === null) return null;

  const acknowledgeInformationalStep = (): void => {
    if (step.informational !== true) return;
    const nextStage: BlueOnboardingArtifactStage = step.id === "artifact_fragments"
      ? "artifact_weapons"
      : "done";
    if (typeof window !== "undefined") {
      window.localStorage.setItem(storageKey, nextStage);
    }
    setArtifactStage(nextStage);
  };

  return (
    <section className="ui-onboarding-guide" aria-label="Guide des premiers pas">
      <div className="ui-onboarding-guide__heading">
        <div>
          <span>{step.eyebrow}</span>
          <strong>{step.title}</strong>
        </div>
        {step.informational === true && (
          <button type="button" onClick={acknowledgeInformationalStep}>J’ai compris</button>
        )}
      </div>
      <p>{step.description}</p>
      <small><span aria-hidden="true">◆</span>{step.hint}</small>
      <em>Suggestion uniquement : vous restez libre de jouer et progresser dans l’ordre de votre choix.</em>
    </section>
  );
}

import { useState } from "react";
import { getItemTier } from "../../data/itemPower";
import { resolveEquipmentInfo } from "../../data/itemContentCatalog";
import { DUNGEON_RELIC_ID } from "../../data/relicContentCatalog";
import { RESEARCH_IDS } from "../../data/researchContentCatalog";
import { WORLD_ZONE_IDS } from "../../data/worldContentCatalog";
import { useGameBridge, useGameServices } from "../../state/GameContext";
import {
  resolveOnboardingGuidance,
  type OnboardingResearchState,
  type OnboardingRelicState,
  type OnboardingTerminalStage,
} from "./onboardingResolver";
import "./onboarding.css";

const TERMINAL_STAGE_STORAGE_KEY = "albion-idle:onboarding-blue-terminal:v1";
const GATHERING_BUILDING_IDS = new Set([
  "lumber_camp",
  "mine",
  "hunting_camp",
  "fiber_camp",
]);

const MODULE_LABELS = {
  island: "Île",
  world: "Monde",
  academy: "Académie",
  merchant: "Marchand",
  dungeons: "Donjons",
  crafting: "Fabrication",
} as const;

function readTerminalStage(): OnboardingTerminalStage {
  if (typeof window === "undefined") return "artifacts";
  const value = window.localStorage.getItem(TERMINAL_STAGE_STORAGE_KEY);
  return value === "artifact_weapons" || value === "done" ? value : "artifacts";
}

function ownsChestTier3OrHigher(itemIds: readonly (string | undefined)[]): boolean {
  return itemIds.some((itemId) => {
    if (itemId === undefined) return false;
    const definition = resolveEquipmentInfo(itemId);
    const tier = getItemTier(itemId);
    return definition?.slot === "chest" && tier !== undefined && tier >= 3;
  });
}

export function OnboardingGuide(): JSX.Element | null {
  const bridge = useGameBridge();
  const services = useGameServices();
  const [terminalStage, setTerminalStage] = useState<OnboardingTerminalStage>(() => {
    if (!services.hasSave() && typeof window !== "undefined") {
      window.localStorage.removeItem(TERMINAL_STAGE_STORAGE_KEY);
      return "artifacts";
    }
    return readTerminalStage();
  });
  const academy = services.getAcademyModel();
  const dungeon = services.getDungeonState();
  const relic = services.getRelicProgress(DUNGEON_RELIC_ID);

  const researchState = (researchId: string): OnboardingResearchState => (
    academy.research.find((entry) => entry.id === researchId)?.state ?? "locked"
  );
  const relicState: OnboardingRelicState = relic?.state ?? "unobtained";
  const builtIds = new Set(bridge.island.buildings.map((building) => building.definitionId));
  const ownedItemIds = [
    ...bridge.equipment.slots.map((slot) => slot.itemId),
    ...bridge.inventory.slots.map((slot) => slot.itemId),
    ...bridge.bank.slots.map((slot) => slot.itemId),
  ];
  const frostpeak = bridge.world.zones.find((zone) => zone.zoneDefId === WORLD_ZONE_IDS.mountain);
  const hasReachedFrostpeak = frostpeak?.isUnlocked === true
    || frostpeak?.isActive === true
    || (frostpeak?.completedSegments.length ?? 0) > 0;
  const hasProgressedBeyondEarlyProduction = bridge.world.zones.some((zone) => (
    zone.worldBandId === "blue"
    && zone.zoneIndexWithinBand >= 3
    && zone.isUnlocked
  ));
  const beyondBlueOnboarding = bridge.world.worldBandId !== "blue"
    || bridge.world.zones.some((zone) => zone.worldBandId !== "blue" && zone.isUnlocked)
    || dungeon.clearedTiers.some((tier) => tier > 4);

  const guidance = resolveOnboardingGuidance({
    hasGatheringBuilding: bridge.island.buildings.some((building) => GATHERING_BUILDING_IDS.has(building.definitionId)),
    hasWorkingWorker: bridge.workers.workers.some((worker) => worker.state === "working"),
    hasWorkshop: builtIds.has("workshop"),
    hasChestTier3OrHigher: ownsChestTier3OrHigher(ownedItemIds),
    hasProgressedBeyondEarlyProduction,
    enchantmentResearchState: researchState(RESEARCH_IDS.enchantmentStudy),
    hasReachedFrostpeak,
    relicState,
    relicResearchState: researchState(RESEARCH_IDS.dungeonRelicAnalysis),
    sanctuaryResearchState: researchState(RESEARCH_IDS.dungeonSanctuaryLocation),
    dungeonUnlocked: services.isDungeonSystemUnlocked(),
    hasActiveDungeon: dungeon.activeRun !== undefined,
    hasClearedT4Dungeon: dungeon.clearedTiers.includes(4),
    beyondBlueOnboarding,
    terminalStage,
  });

  if (guidance === null) return null;

  const isTerminalExplanation = guidance.id === "introduce_artifacts"
    || guidance.id === "introduce_artifact_weapons";

  const acknowledge = (): void => {
    const next: OnboardingTerminalStage = terminalStage === "artifacts"
      ? "artifact_weapons"
      : "done";
    setTerminalStage(next);
    if (typeof window !== "undefined") {
      window.localStorage.setItem(TERMINAL_STAGE_STORAGE_KEY, next);
    }
  };

  return (
    <aside className="ui-onboarding" aria-live="polite">
      <div className="ui-onboarding__header">
        <div>
          <span className="ui-onboarding__eyebrow">Premiers pas · Zone Bleue</span>
          <strong>{guidance.title}</strong>
        </div>
        <span className="ui-onboarding__module">{MODULE_LABELS[guidance.moduleHint]}</span>
      </div>
      <p>{guidance.description}</p>
      {isTerminalExplanation && (
        <button type="button" className="ui-onboarding__ack" onClick={acknowledge}>
          J’ai compris
        </button>
      )}
    </aside>
  );
}

import { useState } from "react";
import { GatheringView } from "../production/gathering/GatheringView";
import { WorldAchievementsView } from "./components/WorldAchievementsView";
import { WorldBestiaryView } from "./components/WorldBestiaryView";
import { WorldDungeonsView } from "./components/WorldDungeonsView";
import { WorldZonesView } from "./components/WorldZonesView";
import { useWorldActions, useWorldZones } from "./useWorldData";
import { useGameBridge, useGameServices } from "../../state/GameContext";
import "./world.css";

type WorldModuleTabId = "zones" | "dungeons" | "gathering" | "bestiary" | "achievements";

const BASE_TABS: readonly { readonly id: WorldModuleTabId; readonly label: string }[] = [
  { id: "zones", label: "Zones" },
  { id: "gathering", label: "Récolte" },
  { id: "bestiary", label: "Bestiaire" },
  { id: "achievements", label: "Succès" },
];

export function WorldModule(): JSX.Element {
  useGameBridge();
  const { isDungeonSystemUnlocked } = useGameServices();
  const [activeTab, setActiveTab] = useState<WorldModuleTabId>("zones");
  const zone = useWorldZones();
  const actions = useWorldActions();
  const dungeonsUnlocked = isDungeonSystemUnlocked();
  const tabs = dungeonsUnlocked
    ? [BASE_TABS[0], { id: "dungeons" as const, label: "Donjons" }, ...BASE_TABS.slice(1)]
    : BASE_TABS;
  const effectiveTab = activeTab === "dungeons" && !dungeonsUnlocked ? "zones" : activeTab;

  return (
    <section className="ui-world">
      <nav className="ui-world__tabs" aria-label="Sections du monde">
        {tabs.map((tab) => (
          <button key={tab.id} type="button" className={effectiveTab === tab.id ? "is-active" : ""} aria-pressed={effectiveTab === tab.id} onClick={() => { setActiveTab(tab.id); }}>
            {tab.label}
          </button>
        ))}
      </nav>

      {effectiveTab === "zones" ? (
        <WorldZonesView zone={zone} onTravel={actions.travelToSegment} onSetFarmMode={actions.setFarmMode} />
      ) : effectiveTab === "dungeons" ? (
        <WorldDungeonsView />
      ) : effectiveTab === "gathering" ? (
        <GatheringView />
      ) : effectiveTab === "bestiary" ? (
        <WorldBestiaryView />
      ) : (
        <WorldAchievementsView />
      )}
    </section>
  );
}

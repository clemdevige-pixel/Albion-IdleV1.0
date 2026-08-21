import { useState } from "react";
import { GatheringView } from "../production/gathering/GatheringView";
import { WorldAchievementsView } from "./components/WorldAchievementsView";
import { WorldBestiaryView } from "./components/WorldBestiaryView";
import { WorldDungeonsView } from "./components/WorldDungeonsView";
import { WorldZonesView } from "./components/WorldZonesView";
import { useWorldActions, useWorldZones } from "./useWorldData";
import "./world.css";

type WorldModuleTabId = "zones" | "dungeons" | "gathering" | "bestiary" | "achievements";

const TABS: readonly { readonly id: WorldModuleTabId; readonly label: string }[] = [
  { id: "zones", label: "Zones" },
  { id: "dungeons", label: "Donjons" },
  { id: "gathering", label: "Récolte" },
  { id: "bestiary", label: "Bestiaire" },
  { id: "achievements", label: "Succès" },
];

export function WorldModule(): JSX.Element {
  const [activeTab, setActiveTab] = useState<WorldModuleTabId>("zones");
  const zone = useWorldZones();
  const actions = useWorldActions();

  return (
    <section className="ui-world">
      <nav className="ui-world__tabs" aria-label="Sections du monde">
        {TABS.map((tab) => (
          <button key={tab.id} type="button" className={activeTab === tab.id ? "is-active" : ""} aria-pressed={activeTab === tab.id} onClick={() => { setActiveTab(tab.id); }}>
            {tab.label}
          </button>
        ))}
      </nav>

      {activeTab === "zones" ? (
        <WorldZonesView zone={zone} onTravel={actions.travelToSegment} onSetFarmMode={actions.setFarmMode} />
      ) : activeTab === "dungeons" ? (
        <WorldDungeonsView />
      ) : activeTab === "gathering" ? (
        <GatheringView />
      ) : activeTab === "bestiary" ? (
        <WorldBestiaryView />
      ) : (
        <WorldAchievementsView />
      )}
    </section>
  );
}

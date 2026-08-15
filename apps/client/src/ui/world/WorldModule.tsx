import { useState } from "react";
import { GatheringView } from "../production/gathering/GatheringView";
import { WorldAchievementsView } from "./components/WorldAchievementsView";
import { WorldBestiaryView } from "./components/WorldBestiaryView";
import { WorldZonesView } from "./components/WorldZonesView";
import { useWorldActions, useWorldZones } from "./useWorldData";
import type { WorldTabId } from "./worldModels";
import "./world.css";

const TABS: readonly { readonly id: WorldTabId; readonly label: string }[] = [
  { id: "zones", label: "Zones" },
  { id: "gathering", label: "Récolte" },
  { id: "bestiary", label: "Bestiaire" },
  { id: "achievements", label: "Succès" },
];

export function WorldModule(): JSX.Element {
  const [activeTab, setActiveTab] = useState<WorldTabId>("zones");
  const zone = useWorldZones();
  const actions = useWorldActions();

  return (
    <section className="ui-world">
      <nav className="ui-world__tabs" aria-label="Sections du monde">
        {TABS.map((tab) => (
          <button key={tab.id} type="button" className={activeTab === tab.id ? "is-active" : ""} aria-pressed={activeTab === tab.id} onClick={() => { setActiveTab(tab.id); }}>
            {tab.label}
            {tab.id === "achievements" ? <small>À venir</small> : null}
          </button>
        ))}
      </nav>

      {activeTab === "zones" ? (
        <WorldZonesView zone={zone} onTravel={actions.travelToSegment} onSetFarmMode={actions.setFarmMode} />
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

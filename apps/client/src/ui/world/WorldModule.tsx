import { useState } from "react";
import { FEATURE_UNLOCK_VISITS, useFeatureUnlockVisit } from "../attention/usePlayerAttention";
import { GatheringView } from "../production/gathering/GatheringView";
import { WorldAchievementsView } from "./components/WorldAchievementsView";
import { WorldBestiaryView } from "./components/WorldBestiaryView";
import { WorldDungeonsView } from "./components/WorldDungeonsView";
import { WorldTowerView } from "./components/WorldTowerView";
import { WorldZonesView } from "./components/WorldZonesView";
import { useWorldActions, useWorldZones } from "./useWorldData";
import { useGameBridge, useGameServices } from "../../state/GameContext";
import { isDevSandboxMode } from "../../runtime/devSandbox";
import "./world.css";

type WorldModuleTabId = "zones" | "dungeons" | "tower" | "gathering" | "bestiary" | "achievements";
type WorldModuleTab = { readonly id: WorldModuleTabId; readonly label: string };

const BASE_TABS: readonly WorldModuleTab[] = [
  { id: "zones", label: "Zones" },
  { id: "gathering", label: "Récolte" },
  { id: "bestiary", label: "Bestiaire" },
  { id: "achievements", label: "Succès" },
];

const DUNGEON_TAB: WorldModuleTab = { id: "dungeons", label: "Donjons" };
const TOWER_TAB: WorldModuleTab = { id: "tower", label: "Tour" };

export function WorldModule(): JSX.Element {
  useGameBridge();
  const { isDungeonSystemUnlocked, isTowerSystemUnlocked } = useGameServices();
  const [activeTab, setActiveTab] = useState<WorldModuleTabId>("zones");
  const zone = useWorldZones();
  const actions = useWorldActions();
  const dungeonsUnlocked = isDungeonSystemUnlocked();
  const towerUnlocked = isTowerSystemUnlocked() || isDevSandboxMode();
  const tabs = BASE_TABS.flatMap((tab) => {
    if (tab.id !== "zones") return [tab];
    return [
      tab,
      ...(dungeonsUnlocked ? [DUNGEON_TAB] : []),
      ...(towerUnlocked ? [TOWER_TAB] : []),
    ];
  });
  const activeTabLocked = (activeTab === "dungeons" && !dungeonsUnlocked)
    || (activeTab === "tower" && !towerUnlocked);
  const effectiveTab = activeTabLocked ? "zones" : activeTab;

  useFeatureUnlockVisit(
    effectiveTab === "dungeons"
      ? FEATURE_UNLOCK_VISITS.dungeons
      : effectiveTab === "tower"
        ? FEATURE_UNLOCK_VISITS.tower
        : [],
  );

  return (
    <section className="ui-world">
      <nav
        className="ui-world__tabs"
        aria-label="Sections du monde"
        style={{ gridTemplateColumns: `repeat(${String(tabs.length)}, minmax(0, 1fr))` }}
      >
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
      ) : effectiveTab === "tower" ? (
        <WorldTowerView />
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

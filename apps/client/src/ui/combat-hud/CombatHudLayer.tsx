import { useSyncExternalStore } from "react";
import { ActivityJournal } from "../../hud/ActivityJournal";
import { AbilityBar } from "../../hud/AbilityBar";
import { HudRoot } from "../../hud/HudRoot";
import { EconomyNotifications } from "../../panels/EconomyNotifications";
import { activityFailureFlow } from "../../runtime/ActivityFailureFlow";
import { dungeonCompletionFlow } from "../../runtime/DungeonCompletionFlow";
import { towerBlockCompletionFlow } from "../../runtime/TowerBlockCompletionFlow";
import { useGameServices } from "../../state/GameContext";
import { ActivityFailurePopup } from "./ActivityFailurePopup";
import { DungeonRecapPopup } from "./DungeonRecapPopup";
import { EnemyStatusVfxOverlay } from "./EnemyStatusVfxOverlay";
import { ExpeditionRecapPopup } from "./ExpeditionRecapPopup";
import { ResearchRecapPopup } from "./ResearchRecapPopup";
import { TowerBlockRecapPopup } from "./TowerBlockRecapPopup";
import "./combatHud.css";
import "./combatState.css";
import "./combatDock.css";

function RecapOverlay(): JSX.Element | null {
  const services = useGameServices();
  const towerBlockRecap = useSyncExternalStore(
    towerBlockCompletionFlow.subscribe,
    towerBlockCompletionFlow.getSnapshot,
    () => null,
  );
  const activityFailure = useSyncExternalStore(
    activityFailureFlow.subscribe,
    activityFailureFlow.getSnapshot,
    () => null,
  );
  const dungeonRecap = useSyncExternalStore(
    dungeonCompletionFlow.subscribe,
    dungeonCompletionFlow.getSnapshot,
    () => null,
  );
  const researchRecap = useSyncExternalStore(
    (listener) => services.subscribeResearchRecap(listener),
    () => services.getResearchRecap(),
    () => null,
  );
  const expeditionRecap = useSyncExternalStore(
    (listener) => services.subscribeExpeditionRecap(listener),
    () => services.getExpeditionRecap(),
    () => null,
  );

  if (towerBlockRecap !== null) {
    return <TowerBlockRecapPopup recap={towerBlockRecap} />;
  }

  if (activityFailure !== null) {
    return <ActivityFailurePopup recap={activityFailure} />;
  }

  if (dungeonRecap !== null) {
    return <DungeonRecapPopup recap={dungeonRecap} />;
  }

  if (researchRecap !== null) {
    return (
      <ResearchRecapPopup
        recap={researchRecap}
        onDismiss={() => { services.dismissResearchRecap(); }}
      />
    );
  }

  if (expeditionRecap !== null) {
    return (
      <ExpeditionRecapPopup
        recap={expeditionRecap}
        onDismiss={() => { services.dismissExpeditionRecap(); }}
      />
    );
  }

  return null;
}

/**
 * React-owned presentation layer displayed over the persistent Phaser world.
 * Gameplay and world-space combat rendering remain authoritative elsewhere.
 */
export function CombatHudLayer(): JSX.Element {
  return (
    <div className="combat-hud-layer">
      <HudRoot />
      <EnemyStatusVfxOverlay />
      <div className="combat-hud-journal">
        <ActivityJournal />
      </div>
      <div className="combat-hud-actions">
        <AbilityBar />
      </div>
      <EconomyNotifications />
      <RecapOverlay />
    </div>
  );
}

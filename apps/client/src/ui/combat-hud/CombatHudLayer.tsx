import { useSyncExternalStore } from "react";
import { ActivityJournal } from "../../hud/ActivityJournal";
import { AbilityBar } from "../../hud/AbilityBar";
import { HudRoot } from "../../hud/HudRoot";
import { EconomyNotifications } from "../../panels/EconomyNotifications";
import { useGameServices } from "../../state/GameContext";
import { EnemyStatusVfxOverlay } from "./EnemyStatusVfxOverlay";
import { ExpeditionRecapPopup } from "./ExpeditionRecapPopup";
import "./combatHud.css";
import "./combatState.css";
import "./combatDock.css";

function ExpeditionRecapOverlay(): JSX.Element | null {
  const services = useGameServices();
  const recap = useSyncExternalStore(
    (listener) => services.subscribeExpeditionRecap(listener),
    () => services.getExpeditionRecap(),
    () => null,
  );

  if (recap === null) return null;

  return (
    <ExpeditionRecapPopup
      recap={recap}
      onDismiss={() => { services.dismissExpeditionRecap(); }}
    />
  );
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
      <ExpeditionRecapOverlay />
    </div>
  );
}

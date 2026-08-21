import { ActivityJournal } from "../../hud/ActivityJournal";
import { AbilityBar } from "../../hud/AbilityBar";
import { HudRoot } from "../../hud/HudRoot";
import { EconomyNotifications } from "../../panels/EconomyNotifications";
import { EnemyStatusVfxOverlay } from "./EnemyStatusVfxOverlay";
import "./combatHud.css";
import "./combatState.css";
import "./combatDock.css";

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
    </div>
  );
}

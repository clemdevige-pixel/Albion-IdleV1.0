import { ActivityJournal } from "../../hud/ActivityJournal";
import { HudRoot } from "../../hud/HudRoot";
import { EconomyNotifications } from "../../panels/EconomyNotifications";
import "./combatHud.css";

/**
 * React-owned presentation layer displayed over the persistent Phaser world.
 * Gameplay and world-space combat rendering remain authoritative elsewhere.
 */
export function CombatHudLayer(): JSX.Element {
  return (
    <div className="combat-hud-layer">
      <HudRoot />
      <ActivityJournal />
      <EconomyNotifications />
    </div>
  );
}

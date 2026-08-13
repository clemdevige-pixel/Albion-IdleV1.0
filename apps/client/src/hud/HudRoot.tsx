import { CombatStateBar } from "./CombatStateBar";
import { ActiveEffectsDisplay } from "./ActiveEffectsDisplay";

/** HUD overlay positioned on top of the Phaser canvas. */
export function HudRoot(): JSX.Element {
  return (
    <div className="hud-root">
      <div className="hud-root__top">
        <CombatStateBar />
      </div>
      <ActiveEffectsDisplay />
    </div>
  );
}

import { CombatStateBar } from "./CombatStateBar";
import { AbilityBar } from "./AbilityBar";
import { ActiveEffectsDisplay } from "./ActiveEffectsDisplay";

/**
 * HUD overlay positioned on top of the Phaser canvas.
 */
export function HudRoot(): JSX.Element {
  return (
    <div className="hud-root">
      <div className="hud-root__top">
        <CombatStateBar />
        <ActiveEffectsDisplay />
      </div>
      <div className="hud-root__bottom">
        <AbilityBar />
      </div>
    </div>
  );
}

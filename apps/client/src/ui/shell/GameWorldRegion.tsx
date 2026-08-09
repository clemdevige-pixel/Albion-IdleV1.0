import { GameViewport } from "../../layout/GameViewport";
import { CombatHudLayer } from "../combat-hud";

export function GameWorldRegion(): JSX.Element {
  return (
    <main className="ui-shell__world" aria-label="Monde de jeu">
      <GameViewport />
      <CombatHudLayer />
    </main>
  );
}

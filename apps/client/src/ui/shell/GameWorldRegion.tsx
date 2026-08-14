import { GameViewport } from "../../layout/GameViewport";
import { CombatHudLayer } from "../combat-hud";

export function GameWorldRegion({ hidden = false }: { readonly hidden?: boolean }): JSX.Element {
  return (
    <main className="ui-shell__world" aria-label="Monde de jeu" hidden={hidden}>
      <GameViewport />
      <CombatHudLayer />
    </main>
  );
}

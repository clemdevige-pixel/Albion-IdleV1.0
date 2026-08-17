import { GameViewport } from "../../layout/GameViewport";
import { CombatHudLayer } from "../combat-hud";
import { WorldSegmentStrip } from "./WorldSegmentStrip";

export function GameWorldRegion({ hidden = false }: { readonly hidden?: boolean }): JSX.Element {
  return (
    <main className="ui-shell__world" aria-label="Monde de jeu" hidden={hidden}>
      <WorldSegmentStrip />
      <div className="ui-shell__combat-surface">
        <GameViewport />
        <CombatHudLayer />
      </div>
    </main>
  );
}

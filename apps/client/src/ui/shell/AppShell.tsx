import { RightPanelHost } from "../modules/RightPanelHost";
import { BottomBarRegion } from "./BottomBarRegion";
import { GameWorldRegion } from "./GameWorldRegion";
import { HeaderRegion } from "./HeaderRegion";

export function AppShell(): JSX.Element {
  return (
    <div className="ui-app-shell">
      <HeaderRegion />
      <GameWorldRegion />
      <RightPanelHost />
      <BottomBarRegion />
    </div>
  );
}

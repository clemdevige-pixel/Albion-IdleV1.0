import { RightPanelHost } from "../modules/RightPanelHost";
import { useNavigation } from "../navigation";
import { UI_MODULE_IDS } from "../navigation/moduleIds";
import { IslandSelectionProvider } from "../island/IslandSelectionContext";
import { IslandWorldRegion } from "../island/IslandWorldRegion";
import { BottomBarRegion } from "./BottomBarRegion";
import { GameWorldRegion } from "./GameWorldRegion";
import { HeaderRegion } from "./HeaderRegion";

export function AppShell(): JSX.Element {
  const { activeModule } = useNavigation();
  const isIsland = activeModule === UI_MODULE_IDS.island;

  return (
    <IslandSelectionProvider>
      <div className="ui-app-shell">
        <HeaderRegion />
        {isIsland ? <IslandWorldRegion /> : <GameWorldRegion />}
        <RightPanelHost />
        <BottomBarRegion />
      </div>
    </IslandSelectionProvider>
  );
}

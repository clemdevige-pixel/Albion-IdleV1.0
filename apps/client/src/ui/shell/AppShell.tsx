import { RightPanelHost } from "../modules/RightPanelHost";
import { useNavigation } from "../navigation";
import { UI_MODULE_IDS } from "../navigation/moduleIds";
import { ResourceTrackingProvider } from "../dashboard/ResourceTrackingContext";
import { IslandSelectionProvider } from "../island/IslandSelectionContext";
import { IslandWorldRegion } from "../island/IslandWorldRegion";
import { OnboardingGuide } from "../onboarding/OnboardingGuide";
import { ResearchRecapOverlay } from "../shared/ResearchRecapOverlay";
import { BottomBarRegion } from "./BottomBarRegion";
import { GameWorldRegion } from "./GameWorldRegion";
import { HeaderRegion } from "./HeaderRegion";

export function AppShell(): JSX.Element {
  const { activeModule } = useNavigation();
  const isIsland = activeModule === UI_MODULE_IDS.island;

  return (
    <ResourceTrackingProvider>
      <IslandSelectionProvider>
        <div className="ui-app-shell">
          <HeaderRegion />
          <GameWorldRegion hidden={isIsland} />
          {isIsland && <IslandWorldRegion />}
          <RightPanelHost />
          <BottomBarRegion />
          <OnboardingGuide />
          <ResearchRecapOverlay />
        </div>
      </IslandSelectionProvider>
    </ResourceTrackingProvider>
  );
}

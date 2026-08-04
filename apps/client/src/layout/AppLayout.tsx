import { TopBar } from "./TopBar";
import { BottomNav } from "./BottomNav";
import { RightSidebar } from "./RightSidebar";
import { GameViewport } from "./GameViewport";
import { HudRoot } from "../hud/HudRoot";
import { CharacterPanel } from "../panels/CharacterPanel";
import { InventoryPanel } from "../panels/InventoryPanel";
import { ProgressionPanel } from "../panels/ProgressionPanel";
import { WalletPanel } from "../panels/WalletPanel";
import { VendorPanel } from "../panels/VendorPanel";
import { EconomyNotifications } from "../panels/EconomyNotifications";
import { GatheringPanel } from "../panels/GatheringPanel";
import { ActivityJournal } from "../hud/ActivityJournal";

export function AppLayout(): JSX.Element {
  return (
    <div className="app-layout">
      <TopBar />
      <div className="app-layout__main">
        <div className="app-layout__viewport-wrapper">
          <GameViewport />
          <HudRoot />
          <ActivityJournal />
          <EconomyNotifications />
          <div className="app-layout__panel-overlay">
            <CharacterPanel />
            <InventoryPanel />
            <ProgressionPanel />
            <WalletPanel />
            <VendorPanel />
            <GatheringPanel />
          </div>
        </div>
        <RightSidebar />
      </div>
      <BottomNav />
    </div>
  );
}

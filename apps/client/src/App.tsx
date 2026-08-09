import { GameProvider } from "./state/GameContext";
import { PanelManagerProvider } from "./panels/PanelManager";
import { AppLayout } from "./layout/AppLayout";

/**
 * Application shell.
 *
 * React owns the permanent shell while Phaser remains mounted in its world
 * region. GameProvider exposes runtime services; PanelManagerProvider keeps
 * legacy panels on the typed single-module navigation contract.
 */
export function App(): JSX.Element {
  return (
    <GameProvider>
      <PanelManagerProvider>
        <AppLayout />
      </PanelManagerProvider>
    </GameProvider>
  );
}

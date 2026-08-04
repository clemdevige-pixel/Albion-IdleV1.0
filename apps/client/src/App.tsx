import { GameProvider } from "./state/GameContext";
import { PanelManagerProvider } from "./panels/PanelManager";
import { AppLayout } from "./layout/AppLayout";

/**
 * Application shell.
 *
 * React owns the UI chrome; the world is delegated to Phaser via the
 * GameViewport inside AppLayout. GameProvider exposes runtime services;
 * PanelManagerProvider enforces the single-panel policy.
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

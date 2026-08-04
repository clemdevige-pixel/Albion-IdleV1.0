import { PhaserGame } from "../game/PhaserGame";

/**
 * Wrapper for the Phaser canvas. Takes all remaining space in the main area.
 */
export function GameViewport(): JSX.Element {
  return (
    <div className="game-viewport">
      <PhaserGame />
    </div>
  );
}

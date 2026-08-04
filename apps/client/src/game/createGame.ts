import Phaser from "phaser";
import { GameScene } from "./GameScene";
import type { GameBridge } from "./GameBridge";

/**
 * Factory that builds and returns a Phaser game instance mounted into `parent`.
 *
 * Configured for pixel-art rendering at 960x540 (scaled 2x for 1920x1080).
 */
export function createGame(parent: HTMLElement, bridge: GameBridge): Phaser.Game {
  /**
   * Wrapper scene class that injects the bridge via init data.
   */
  class BridgedGameScene extends GameScene {
    constructor() {
      super();
    }
  }

  const game = new Phaser.Game({
    type: Phaser.AUTO,
    parent,
    width: 960,
    height: 540,
    backgroundColor: "#161b26",
    pixelArt: true,
    roundPixels: true,
    scale: {
      mode: Phaser.Scale.FIT,
      autoCenter: Phaser.Scale.CENTER_BOTH,
    },
    scene: [],
  });

  // Start the scene with bridge data
  game.scene.add(GameScene.KEY, BridgedGameScene, true, { bridge });

  return game;
}

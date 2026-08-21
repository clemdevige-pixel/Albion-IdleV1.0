import Phaser from "phaser";
import { GameScene } from "./GameScene";
import type { GameBridge } from "./GameBridge";

/**
 * Factory that builds and returns a Phaser game instance mounted into `parent`.
 *
 * The combat world uses a wide 960x400 logical viewport so the persistent scene
 * reads as a cinematic idle-combat band without shrinking actors horizontally.
 */
export function createGame(
  parent: HTMLElement,
  bridge: GameBridge,
  playerDisplayName: string,
): Phaser.Game {
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
    height: 400,
    backgroundColor: "#161b26",
    pixelArt: true,
    roundPixels: true,
    scale: {
      mode: Phaser.Scale.FIT,
      autoCenter: Phaser.Scale.CENTER_BOTH,
    },
    scene: [],
  });

  game.scene.add(GameScene.KEY, BridgedGameScene, true, { bridge, playerDisplayName });

  return game;
}

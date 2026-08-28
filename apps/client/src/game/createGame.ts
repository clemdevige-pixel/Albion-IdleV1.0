import Phaser from "phaser";
import { GameScene } from "./GameScene";
import type { GameBridge } from "./GameBridge";

/**
 * Factory that builds and returns a Phaser game instance mounted into `parent`.
 *
 * The combat world uses a wide 960x400 logical viewport so the persistent scene
 * reads as a cinematic idle-combat band without shrinking actors horizontally.
 * ENVELOP keeps that logical ratio while filling the whole combat surface; any
 * excess is cropped symmetrically instead of exposing empty bands around it.
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

  const devTest = new URLSearchParams(window.location.search).get("devTest") === "1";

  const game = new Phaser.Game({
    type: Phaser.AUTO,
    parent,
    width: 960,
    height: 400,
    backgroundColor: "#161b26",
    pixelArt: !devTest,
    roundPixels: !devTest,
    scale: {
      mode: Phaser.Scale.ENVELOP,
      autoCenter: Phaser.Scale.CENTER_BOTH,
    },
    scene: [],
  });

  game.scene.add(GameScene.KEY, BridgedGameScene, true, { bridge, playerDisplayName });

  return game;
}

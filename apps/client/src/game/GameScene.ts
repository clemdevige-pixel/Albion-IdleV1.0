import Phaser from "phaser";
import type { GameBridge } from "./GameBridge";
import {
  preloadRegisteredRenderAssets,
  prepareRegisteredRenderAssets,
} from "./render/RenderAssetPipeline";
import { renderManifestRegistry } from "./render/defaultRenderManifestRegistry";
import { GamePresentationRuntime } from "./render/presentation/GamePresentationRuntime";

/** Phaser entry point. Gameplay remains authoritative through GameBridge. */
export class GameScene extends Phaser.Scene {
  public static readonly KEY = "GameScene";

  private bridge: GameBridge | undefined;
  private runtime: GamePresentationRuntime | undefined;

  public constructor() {
    super(GameScene.KEY);
  }

  public init(data: { bridge?: GameBridge }): void {
    this.bridge = data.bridge;
  }

  public preload(): void {
    preloadRegisteredRenderAssets(this, renderManifestRegistry);
  }

  public create(): void {
    prepareRegisteredRenderAssets(this, renderManifestRegistry);
    this.runtime = new GamePresentationRuntime(this, () => this.bridge);
    this.runtime.create();
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.runtime?.clear();
      this.runtime = undefined;
    });
  }

  public override update(): void {
    this.runtime?.update();
  }
}

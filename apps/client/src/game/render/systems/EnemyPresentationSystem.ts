import type Phaser from "phaser";
import type { StaticActorRenderManifest } from "../RenderManifest";
import { renderManifestRegistry } from "../defaultRenderManifestRegistry";
import {
  applyStaticActorManifest,
  configureStaticActorTexture,
  preloadStaticActorManifest,
} from "../PhaserStaticActorRenderer";

export interface EnemyPresentationState {
  readonly visualManifestId: string;
  readonly isBoss: boolean;
}

export interface EnemyHudLayout {
  readonly healthBarWidth: number;
  readonly healthBarOffsetY: number;
}

export function preloadEnemyPresentationAssets(scene: Phaser.Scene): void {
  for (const manifest of renderManifestRegistry.listStaticActors()) {
    preloadStaticActorManifest(scene, manifest);
  }
}

/** Owns enemy asset selection, sizing and the Phaser actor container. */
export class EnemyPresentationSystem {
  public readonly sprite: Phaser.GameObjects.Image;
  public readonly body: Phaser.GameObjects.Container;
  public isBoss = false;
  public hudLayout: EnemyHudLayout;
  private currentProfileId = "";

  public constructor(
    private readonly scene: Phaser.Scene,
    x: number,
    y: number,
    fallback: StaticActorRenderManifest,
  ) {
    this.hudLayout = fallback.hud;
    this.sprite = scene.add
      .image(fallback.offset.x, fallback.offset.y, fallback.textureKey)
      .setOrigin(fallback.origin.x, fallback.origin.y)
      .setDisplaySize(fallback.display.width, fallback.display.height);
    // The fallback exists only so renderer dependencies always have a valid
    // manifest. It must never be presented as a real enemy before the combat
    // bridge publishes an authoritative spawn.
    this.body = scene.add.container(x, y, [this.sprite]).setDepth(5).setVisible(false);
  }

  public update(state: EnemyPresentationState): void {
    this.isBoss = state.isBoss;
    if (state.visualManifestId === this.currentProfileId) return;

    const manifest = renderManifestRegistry.requireStaticActor(
      state.visualManifestId,
    );
    this.currentProfileId = manifest.id;
    this.hudLayout = manifest.hud;
    configureStaticActorTexture(this.scene, manifest);
    applyStaticActorManifest(this.sprite, manifest);
  }

  public setVisible(visible: boolean): void {
    this.body.setVisible(visible);
  }

  public clear(): void {
    this.body.destroy(true);
  }
}

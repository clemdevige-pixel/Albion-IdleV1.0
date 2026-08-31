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
  private visible = false;
  private hasAuthoritativeProfile = false;

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
    // The fallback only satisfies renderer construction. Visibility is locked
    // until update() explicitly adopts an authoritative enemy presentation.
    this.body = scene.add.container(x, y, [this.sprite]).setDepth(5).setVisible(false);
  }

  public update(state: EnemyPresentationState): void {
    this.isBoss = state.isBoss;
    const manifest = renderManifestRegistry.requireStaticActor(state.visualManifestId);
    this.hasAuthoritativeProfile = true;

    if (manifest.id === this.currentProfileId) return;

    this.currentProfileId = manifest.id;
    this.hudLayout = manifest.hud;
    configureStaticActorTexture(this.scene, manifest);
    applyStaticActorManifest(this.sprite, manifest);
  }

  public setVisible(visible: boolean): void {
    if (!visible) {
      // Hiding marks an encounter boundary: drop presentation authority so a
      // later visibility toggle cannot expose the constructor fallback or a
      // stale previous enemy without a fresh authoritative update().
      this.hasAuthoritativeProfile = false;
      this.currentProfileId = "";
      if (!this.visible) return;
      this.visible = false;
      this.body.setVisible(false);
      return;
    }

    if (!this.hasAuthoritativeProfile || this.visible) return;
    this.visible = true;
    this.body.setVisible(true);
  }

  public clear(): void {
    this.hasAuthoritativeProfile = false;
    this.currentProfileId = "";
    this.visible = false;
    this.body.destroy(true);
  }
}

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
      .setDisplaySize(fallback.display.width, fallback.display.height)
      .setVisible(false);
    // The fallback only satisfies renderer construction. Both the sprite and
    // its container stay non-presentable until update() adopts an authoritative
    // enemy and setVisible(true) explicitly publishes it.
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
      // Hiding is deliberately idempotent. Never trust cached visibility:
      // Phaser systems/tweens may have touched the container independently.
      // Force both layers hidden so the constructor fallback or a stale enemy
      // cannot leak through an out-of-sync container state.
      this.hasAuthoritativeProfile = false;
      this.currentProfileId = "";
      this.sprite.setVisible(false);
      this.body.setVisible(false);
      return;
    }

    if (!this.hasAuthoritativeProfile) {
      this.sprite.setVisible(false);
      this.body.setVisible(false);
      return;
    }

    this.sprite.setVisible(true);
    this.body.setVisible(true);
  }

  public clear(): void {
    this.hasAuthoritativeProfile = false;
    this.currentProfileId = "";
    this.sprite.setVisible(false);
    this.body.setVisible(false);
    this.body.destroy(true);
  }
}

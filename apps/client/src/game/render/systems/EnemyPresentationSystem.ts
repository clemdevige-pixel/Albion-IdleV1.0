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

/**
 * Owns enemy asset selection, sizing and the Phaser actor container.
 *
 * The container intentionally starts empty. A renderable enemy sprite is only
 * created after update() receives an authoritative manifest. The default
 * static-actor manifest is metadata-only here; it must never become a visible
 * placeholder for an absent enemy.
 */
export class EnemyPresentationSystem {
  public readonly body: Phaser.GameObjects.Container;
  public isBoss = false;
  public hudLayout: EnemyHudLayout;
  private currentProfileId = "";
  private hasAuthoritativeProfile = false;
  private enemySprite: Phaser.GameObjects.Image | undefined;

  public constructor(
    private readonly scene: Phaser.Scene,
    x: number,
    y: number,
    fallback: StaticActorRenderManifest,
  ) {
    this.hudLayout = fallback.hud;
    this.body = scene.add.container(x, y).setDepth(5).setVisible(false);
  }

  /** Only valid after update() has adopted an authoritative enemy manifest. */
  public get sprite(): Phaser.GameObjects.Image {
    if (this.enemySprite === undefined) {
      throw new Error("Enemy sprite requested before authoritative presentation");
    }
    return this.enemySprite;
  }

  public update(state: EnemyPresentationState): void {
    this.isBoss = state.isBoss;
    const manifest = renderManifestRegistry.requireStaticActor(state.visualManifestId);
    this.hasAuthoritativeProfile = true;

    if (this.enemySprite === undefined) {
      configureStaticActorTexture(this.scene, manifest);
      this.enemySprite = this.scene.add
        .image(manifest.offset.x, manifest.offset.y, manifest.textureKey)
        .setVisible(false);
      this.body.add(this.enemySprite);
      applyStaticActorManifest(this.enemySprite, manifest);
      this.currentProfileId = manifest.id;
      this.hudLayout = manifest.hud;
      return;
    }

    if (manifest.id === this.currentProfileId) return;

    this.currentProfileId = manifest.id;
    this.hudLayout = manifest.hud;
    configureStaticActorTexture(this.scene, manifest);
    applyStaticActorManifest(this.enemySprite, manifest);
  }

  public setVisible(visible: boolean): void {
    if (!visible) {
      this.hasAuthoritativeProfile = false;
      this.currentProfileId = "";
      this.enemySprite?.setVisible(false);
      this.body.setVisible(false);
      return;
    }

    if (!this.hasAuthoritativeProfile || this.enemySprite === undefined) {
      this.enemySprite?.setVisible(false);
      this.body.setVisible(false);
      return;
    }

    this.enemySprite.setVisible(true);
    this.body.setVisible(true);
  }

  public clear(): void {
    this.hasAuthoritativeProfile = false;
    this.currentProfileId = "";
    this.enemySprite?.setVisible(false);
    this.body.setVisible(false);
    this.body.destroy(true);
    this.enemySprite = undefined;
  }
}

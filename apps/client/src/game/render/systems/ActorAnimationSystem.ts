import Phaser from "phaser";
import {
  applyActorAnimation,
  applyActorDeathPose,
  getActorAnimationKey,
} from "../PhaserActorRenderer";
import type { ActorAnimationState, ActorRenderManifest } from "../RenderManifest";

/** Owns actor animation playback, poses and automatic idle restoration. */
export class ActorAnimationSystem {
  private playbackToken = 0;

  public constructor(
    private readonly sprite: Phaser.GameObjects.Sprite,
  ) {}

  public play(
    manifest: ActorRenderManifest,
    state: ActorAnimationState,
    canReturnToIdle: () => boolean,
  ): void {
    const token = ++this.playbackToken;
    applyActorAnimation(this.sprite, manifest, state);

    if (state === "idle") return;

    this.sprite.once(Phaser.Animations.Events.ANIMATION_COMPLETE, () => {
      if (token !== this.playbackToken || !canReturnToIdle()) return;
      this.play(manifest, "idle", canReturnToIdle);
    });
  }

  public presentDeath(manifest: ActorRenderManifest): void {
    this.playbackToken += 1;
    applyActorDeathPose(this.sprite, manifest);
  }

  public presentStatic(
    textureKey: string,
    width: number,
    height: number,
  ): void {
    this.playbackToken += 1;
    this.sprite
      .stop()
      .setTexture(textureKey)
      .setDisplaySize(width, height)
      .setVisible(true);
  }

  public getAnimationKey(
    manifest: ActorRenderManifest,
    state: ActorAnimationState,
  ): string {
    return getActorAnimationKey(manifest, state);
  }

  public getDeathTexture(manifest: ActorRenderManifest): string {
    return manifest.poses.death.textureKey;
  }

  public get textureKey(): string {
    return this.sprite.texture.key;
  }

  public get currentAnimationKey(): string {
    return this.sprite.anims.currentAnim?.key ?? "";
  }

  public stop(): void {
    this.playbackToken += 1;
    this.sprite.stop();
  }

  public clear(): void {
    this.playbackToken += 1;
  }
}

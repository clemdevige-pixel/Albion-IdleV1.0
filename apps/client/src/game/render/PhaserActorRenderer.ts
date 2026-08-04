import Phaser from "phaser";
import {
  ACTOR_ANIMATION_STATES,
  type ActorAnimationState,
  type ActorRenderManifest,
} from "./RenderManifest";

export function preloadActorManifest(
  scene: Phaser.Scene,
  manifest: ActorRenderManifest,
): void {
  for (const state of ACTOR_ANIMATION_STATES) {
    const animation = manifest.animations[state];
    scene.load.spritesheet(animation.textureKey, animation.assetPath, {
      frameWidth: animation.frameWidth,
      frameHeight: animation.frameHeight,
    });
  }
  scene.load.image(manifest.poses.death.textureKey, manifest.poses.death.assetPath);
}

export function registerActorAnimations(
  scene: Phaser.Scene,
  manifest: ActorRenderManifest,
): void {
  for (const state of ACTOR_ANIMATION_STATES) {
    const animation = manifest.animations[state];
    const animationKey = getActorAnimationKey(manifest, state);
    if (scene.anims.exists(animationKey)) continue;
    scene.anims.create({
      key: animationKey,
      frames: scene.anims.generateFrameNumbers(animation.textureKey, {
        start: animation.startFrame,
        end: animation.endFrame,
      }),
      frameRate: animation.frameRate,
      repeat: animation.repeat,
    });
  }
}

export function configureActorTextures(
  scene: Phaser.Scene,
  manifest: ActorRenderManifest,
): void {
  for (const state of ACTOR_ANIMATION_STATES) {
    scene.textures
      .get(manifest.animations[state].textureKey)
      .setFilter(Phaser.Textures.FilterMode.NEAREST);
  }
  scene.textures
    .get(manifest.poses.death.textureKey)
    .setFilter(Phaser.Textures.FilterMode.NEAREST);
}

export function createActorSprite(
  scene: Phaser.Scene,
  manifest: ActorRenderManifest,
): Phaser.GameObjects.Sprite {
  const idle = manifest.animations.idle;
  return scene.add
    .sprite(
      manifest.offset.x,
      manifest.offset.y,
      idle.textureKey,
      idle.startFrame,
    )
    .setOrigin(manifest.origin.x, manifest.origin.y)
    .setDisplaySize(idle.display.width, idle.display.height);
}

export function getActorAnimationKey(
  manifest: ActorRenderManifest,
  state: ActorAnimationState,
): string {
  return `${manifest.id}:${state}`;
}

export function applyActorAnimation(
  sprite: Phaser.GameObjects.Sprite,
  manifest: ActorRenderManifest,
  state: ActorAnimationState,
): void {
  const animation = manifest.animations[state];
  sprite
    .stop()
    .setTexture(animation.textureKey, 0)
    .setOrigin(manifest.origin.x, manifest.origin.y)
    .setPosition(manifest.offset.x, manifest.offset.y)
    .setDisplaySize(animation.display.width, animation.display.height)
    .setVisible(true)
    .play(getActorAnimationKey(manifest, state));
}

export function applyActorDeathPose(
  sprite: Phaser.GameObjects.Sprite,
  manifest: ActorRenderManifest,
): void {
  const death = manifest.poses.death;
  sprite
    .stop()
    .setTexture(death.textureKey)
    .setOrigin(manifest.origin.x, manifest.origin.y)
    .setPosition(manifest.offset.x, manifest.offset.y)
    .setDisplaySize(death.display.width, death.display.height)
    .setVisible(true);
}

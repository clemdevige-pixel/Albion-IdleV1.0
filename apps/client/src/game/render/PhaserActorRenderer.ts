import Phaser from "phaser";
import {
  ACTOR_ANIMATION_STATES,
  type ActorAnimationState,
  type ActorPoseManifest,
  type ActorRenderManifest,
} from "./RenderManifest";

type AnimatedActorPoseManifest = ActorPoseManifest & Required<Pick<
  ActorPoseManifest,
  "frameWidth" | "frameHeight" | "startFrame" | "endFrame" | "frameRate"
>>;

function hasAnimatedDeath(
  manifest: ActorRenderManifest,
): manifest is ActorRenderManifest & {
  readonly poses: { readonly death: AnimatedActorPoseManifest };
} {
  const death = manifest.poses.death;
  return death.frameWidth !== undefined
    && death.frameHeight !== undefined
    && death.startFrame !== undefined
    && death.endFrame !== undefined
    && death.frameRate !== undefined;
}

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
  if (hasAnimatedDeath(manifest)) {
    const death = manifest.poses.death;
    scene.load.spritesheet(death.textureKey, death.assetPath, {
      frameWidth: death.frameWidth,
      frameHeight: death.frameHeight,
    });
  } else {
    const death = manifest.poses.death;
    scene.load.image(death.textureKey, death.assetPath);
  }
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

  if (hasAnimatedDeath(manifest)) {
    const death = manifest.poses.death;
    const animationKey = getActorDeathAnimationKey(manifest);
    if (!scene.anims.exists(animationKey)) {
      scene.anims.create({
        key: animationKey,
        frames: scene.anims.generateFrameNumbers(death.textureKey, {
          start: death.startFrame,
          end: death.endFrame,
        }),
        frameRate: death.frameRate,
        repeat: death.repeat ?? 0,
      });
    }
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

export function getActorDeathAnimationKey(manifest: ActorRenderManifest): string {
  return `${manifest.id}:death`;
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
    .setTexture(death.textureKey, 0)
    .setOrigin(manifest.origin.x, manifest.origin.y)
    .setPosition(manifest.offset.x, manifest.offset.y)
    .setDisplaySize(death.display.width, death.display.height)
    .setVisible(true);

  if (hasAnimatedDeath(manifest)) {
    sprite.play(getActorDeathAnimationKey(manifest));
  }
}

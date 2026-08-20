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

function hasTexture(scene: Phaser.Scene, textureKey: string): boolean {
  return scene.textures.exists(textureKey);
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
    if (scene.anims.exists(animationKey) || !hasTexture(scene, animation.textureKey)) continue;
    const frames = scene.anims.generateFrameNumbers(animation.textureKey, {
      start: animation.startFrame,
      end: animation.endFrame,
    });
    if (frames.length === 0) continue;
    scene.anims.create({
      key: animationKey,
      frames,
      frameRate: animation.frameRate,
      repeat: animation.repeat,
    });
  }

  if (hasAnimatedDeath(manifest)) {
    const death = manifest.poses.death;
    const animationKey = getActorDeathAnimationKey(manifest);
    if (!scene.anims.exists(animationKey) && hasTexture(scene, death.textureKey)) {
      const frames = scene.anims.generateFrameNumbers(death.textureKey, {
        start: death.startFrame,
        end: death.endFrame,
      });
      if (frames.length > 0) {
        scene.anims.create({
          key: animationKey,
          frames,
          frameRate: death.frameRate,
          repeat: death.repeat ?? 0,
        });
      }
    }
  }
}

export function configureActorTextures(
  scene: Phaser.Scene,
  manifest: ActorRenderManifest,
): void {
  for (const state of ACTOR_ANIMATION_STATES) {
    const textureKey = manifest.animations[state].textureKey;
    if (!hasTexture(scene, textureKey)) continue;
    scene.textures
      .get(textureKey)
      .setFilter(Phaser.Textures.FilterMode.NEAREST);
  }
  const deathTextureKey = manifest.poses.death.textureKey;
  if (hasTexture(scene, deathTextureKey)) {
    scene.textures
      .get(deathTextureKey)
      .setFilter(Phaser.Textures.FilterMode.NEAREST);
  }
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
  const animationKey = getActorAnimationKey(manifest, state);
  if (!hasTexture(sprite.scene, animation.textureKey) || !sprite.scene.anims.exists(animationKey)) {
    return;
  }
  sprite
    .stop()
    .setTexture(animation.textureKey, 0)
    .setOrigin(manifest.origin.x, manifest.origin.y)
    .setPosition(manifest.offset.x, manifest.offset.y)
    .setDisplaySize(animation.display.width, animation.display.height)
    .setVisible(true)
    .play(animationKey);
}

export function applyActorDeathPose(
  sprite: Phaser.GameObjects.Sprite,
  manifest: ActorRenderManifest,
): void {
  const death = manifest.poses.death;
  if (!hasTexture(sprite.scene, death.textureKey)) return;

  sprite
    .stop()
    .setTexture(death.textureKey, 0)
    .setOrigin(manifest.origin.x, manifest.origin.y)
    .setPosition(manifest.offset.x, manifest.offset.y)
    .setDisplaySize(death.display.width, death.display.height)
    .setVisible(true);

  const animationKey = getActorDeathAnimationKey(manifest);
  if (hasAnimatedDeath(manifest) && sprite.scene.anims.exists(animationKey)) {
    sprite.play(animationKey);
  }
}

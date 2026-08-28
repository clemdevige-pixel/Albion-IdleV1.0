import Phaser from "phaser";
import {
  ACTOR_ANIMATION_STATES,
  type ActorAnimationManifest,
  type ActorAnimationState,
  type ActorPoseManifest,
  type ActorRenderManifest,
} from "./RenderManifest";
import { scaleCombatActorDisplay } from "./actorPresentationScale";

type AnimatedActorPoseManifest = ActorPoseManifest &
  Required<
    Pick<ActorPoseManifest, "frameWidth" | "frameHeight" | "startFrame" | "endFrame" | "frameRate">
  >;

type AnimationSource = Pick<
  ActorAnimationManifest,
  "textureKey" | "startFrame" | "endFrame" | "frameRate" | "repeat"
>;

function hasAnimatedDeath(manifest: ActorRenderManifest): manifest is ActorRenderManifest & {
  readonly poses: { readonly death: AnimatedActorPoseManifest };
} {
  const death = manifest.poses.death;
  return (
    death.frameWidth !== undefined &&
    death.frameHeight !== undefined &&
    death.startFrame !== undefined &&
    death.endFrame !== undefined &&
    death.frameRate !== undefined
  );
}

function hasTexture(scene: Phaser.Scene, textureKey: string): boolean {
  return scene.textures.exists(textureKey);
}

function registerAnimation(
  scene: Phaser.Scene,
  animationKey: string,
  source: AnimationSource,
): void {
  if (scene.anims.exists(animationKey)) {
    scene.anims.remove(animationKey);
  }

  if (!hasTexture(scene, source.textureKey)) {
    console.error(
      `[Render] Cannot register animation "${animationKey}": texture "${source.textureKey}" is missing.`,
    );
    return;
  }

  const frames = scene.anims.generateFrameNumbers(source.textureKey, {
    start: source.startFrame,
    end: source.endFrame,
  });
  const expectedFrameCount = source.endFrame - source.startFrame + 1;

  if (frames.length !== expectedFrameCount) {
    console.error(
      `[Render] Cannot register animation "${animationKey}": expected ${expectedFrameCount} frames from texture "${source.textureKey}", got ${frames.length}.`,
    );
    return;
  }

  scene.anims.create({
    key: animationKey,
    frames,
    frameRate: source.frameRate,
    repeat: source.repeat,
  });
}

export function preloadActorManifest(scene: Phaser.Scene, manifest: ActorRenderManifest): void {
  const queuedTextureKeys = new Set<string>();
  const queueSpritesheet = (
    textureKey: string,
    assetPath: string,
    frameWidth: number,
    frameHeight: number,
  ): void => {
    if (queuedTextureKeys.has(textureKey)) return;
    queuedTextureKeys.add(textureKey);
    scene.load.spritesheet(textureKey, assetPath, { frameWidth, frameHeight });
  };

  for (const state of ACTOR_ANIMATION_STATES) {
    const animation = manifest.animations[state];
    queueSpritesheet(
      animation.textureKey,
      animation.assetPath,
      animation.frameWidth,
      animation.frameHeight,
    );
  }

  if (hasAnimatedDeath(manifest)) {
    const death = manifest.poses.death;
    queueSpritesheet(
      death.textureKey,
      death.assetPath,
      death.frameWidth,
      death.frameHeight,
    );
  } else {
    const death = manifest.poses.death;
    if (!queuedTextureKeys.has(death.textureKey)) {
      queuedTextureKeys.add(death.textureKey);
      scene.load.image(death.textureKey, death.assetPath);
    }
  }
}

export function registerActorAnimations(scene: Phaser.Scene, manifest: ActorRenderManifest): void {
  for (const state of ACTOR_ANIMATION_STATES) {
    registerAnimation(scene, getActorAnimationKey(manifest, state), manifest.animations[state]);
  }

  if (hasAnimatedDeath(manifest)) {
    const death = manifest.poses.death;
    registerAnimation(scene, getActorDeathAnimationKey(manifest), {
      textureKey: death.textureKey,
      startFrame: death.startFrame,
      endFrame: death.endFrame,
      frameRate: death.frameRate,
      repeat: death.repeat ?? 0,
    });
  }
}

export function configureActorTextures(scene: Phaser.Scene, manifest: ActorRenderManifest): void {
  for (const state of ACTOR_ANIMATION_STATES) {
    const textureKey = manifest.animations[state].textureKey;
    if (!hasTexture(scene, textureKey)) continue;
    scene.textures.get(textureKey).setFilter(Phaser.Textures.FilterMode.NEAREST);
  }

  const deathTextureKey = manifest.poses.death.textureKey;
  if (hasTexture(scene, deathTextureKey)) {
    scene.textures.get(deathTextureKey).setFilter(Phaser.Textures.FilterMode.NEAREST);
  }
}

export function createActorSprite(
  scene: Phaser.Scene,
  manifest: ActorRenderManifest,
): Phaser.GameObjects.Sprite {
  const idle = manifest.animations.idle;
  const offset = idle.offset ?? manifest.offset;
  const display = scaleCombatActorDisplay(idle.display.width, idle.display.height);
  return scene.add
    .sprite(offset.x, offset.y, idle.textureKey, idle.startFrame)
    .setOrigin(manifest.origin.x, manifest.origin.y)
    .setDisplaySize(display.width, display.height);
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
  const offset = animation.offset ?? manifest.offset;
  const animationKey = getActorAnimationKey(manifest, state);

  if (!hasTexture(sprite.scene, animation.textureKey)) {
    console.error(
      `[Render] Cannot play animation "${animationKey}": texture "${animation.textureKey}" is missing.`,
    );
    return;
  }

  if (!sprite.scene.anims.exists(animationKey)) {
    console.error(`[Render] Cannot play animation "${animationKey}": animation is not registered.`);
    return;
  }

  const display = scaleCombatActorDisplay(animation.display.width, animation.display.height);
  sprite
    .stop()
    .setTexture(animation.textureKey, animation.startFrame)
    .setOrigin(manifest.origin.x, manifest.origin.y)
    .setPosition(offset.x, offset.y)
    .setDisplaySize(display.width, display.height)
    .setVisible(true)
    .play(animationKey);
}

export function applyActorDeathPose(
  sprite: Phaser.GameObjects.Sprite,
  manifest: ActorRenderManifest,
): void {
  const death = manifest.poses.death;
  const offset = death.offset ?? manifest.offset;
  if (!hasTexture(sprite.scene, death.textureKey)) {
    console.error(
      `[Render] Cannot apply death pose for "${manifest.id}": texture "${death.textureKey}" is missing.`,
    );
    return;
  }

  const display = scaleCombatActorDisplay(death.display.width, death.display.height);
  sprite
    .stop()
    .setTexture(death.textureKey, death.startFrame ?? 0)
    .setOrigin(manifest.origin.x, manifest.origin.y)
    .setPosition(offset.x, offset.y)
    .setDisplaySize(display.width, display.height)
    .setVisible(true);

  const animationKey = getActorDeathAnimationKey(manifest);
  if (hasAnimatedDeath(manifest)) {
    if (!sprite.scene.anims.exists(animationKey)) {
      console.error(
        `[Render] Cannot play animation "${animationKey}": animation is not registered.`,
      );
      return;
    }
    sprite.play(animationKey);
  }
}

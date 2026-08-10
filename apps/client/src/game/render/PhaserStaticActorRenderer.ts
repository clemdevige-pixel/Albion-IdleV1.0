import Phaser from "phaser";
import type { StaticActorRenderManifest } from "./RenderManifest";
import { resolveAspectPreservingDisplaySize } from "./aspectRatio";

export function preloadStaticActorManifest(
  scene: Phaser.Scene,
  manifest: StaticActorRenderManifest,
): void {
  scene.load.image(manifest.textureKey, manifest.assetPath);
}

export function applyStaticActorManifest(
  image: Phaser.GameObjects.Image,
  manifest: StaticActorRenderManifest,
): void {
  image
    .setTexture(manifest.textureKey)
    .setOrigin(manifest.origin.x, manifest.origin.y)
    .setPosition(manifest.offset.x, manifest.offset.y);

  const display = resolveAspectPreservingDisplaySize(
    image.width,
    image.height,
    manifest.display.height,
  );

  image
    .setDisplaySize(display.width, display.height)
    .setVisible(true);
}

export function configureStaticActorTexture(
  scene: Phaser.Scene,
  manifest: StaticActorRenderManifest,
): void {
  scene.textures
    .get(manifest.textureKey)
    .setFilter(Phaser.Textures.FilterMode.NEAREST);
}

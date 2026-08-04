import Phaser from "phaser";
import type { RenderManifestRegistry } from "./RenderManifestRegistry";
import {
  configureActorTextures,
  preloadActorManifest,
  registerActorAnimations,
} from "./PhaserActorRenderer";
import {
  configureStaticActorTexture,
  preloadStaticActorManifest,
} from "./PhaserStaticActorRenderer";
import { preloadEnvironmentManifest } from "./systems/EnvironmentSystem";

/** Preloads every file-backed visual currently registered in the catalog. */
export function preloadRegisteredRenderAssets(
  scene: Phaser.Scene,
  registry: RenderManifestRegistry,
): void {
  for (const manifest of registry.listEnvironments()) {
    preloadEnvironmentManifest(scene, manifest);
  }
  for (const manifest of registry.listActors()) {
    preloadActorManifest(scene, manifest);
  }
  for (const manifest of registry.listStaticActors()) {
    preloadStaticActorManifest(scene, manifest);
  }
  for (const manifest of registry.listResourceNodes()) {
    scene.load.image(manifest.textureKey, manifest.assetPath);
  }
}

/** Configures loaded textures and animations before actors are instantiated. */
export function prepareRegisteredRenderAssets(
  scene: Phaser.Scene,
  registry: RenderManifestRegistry,
): void {
  for (const manifest of registry.listActors()) {
    configureActorTextures(scene, manifest);
    registerActorAnimations(scene, manifest);
  }
  for (const manifest of registry.listStaticActors()) {
    configureStaticActorTexture(scene, manifest);
  }
  for (const manifest of registry.listResourceNodes()) {
    scene.textures
      .get(manifest.textureKey)
      .setFilter(Phaser.Textures.FilterMode.NEAREST);
  }
}

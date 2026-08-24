import { resolveEquipmentPresentation } from "../../data/equipmentPresentation";
import { renderManifestRegistry } from "../../game/render/defaultRenderManifestRegistry";

export type HeroIdlePresentation = {
  readonly image: string;
  readonly spriteSheet: false;
} | {
  readonly image: string;
  readonly spriteSheet: true;
  readonly frameWidth: number;
  readonly frameHeight: number;
  readonly frameCount: number;
};

export function getEquippedHeroIdlePresentation(
  weaponId: string | undefined,
): HeroIdlePresentation {
  const presentation = resolveEquipmentPresentation(weaponId);
  if (presentation?.actorManifestId !== undefined) {
    const actorManifest = renderManifestRegistry.getActor(presentation.actorManifestId);
    if (actorManifest !== undefined) {
      const idle = actorManifest.animations.idle;
      return {
        image: idle.assetPath,
        spriteSheet: true,
        frameWidth: idle.frameWidth,
        frameHeight: idle.frameHeight,
        frameCount: idle.endFrame - idle.startFrame + 1,
      };
    }
  }

  if (weaponId !== undefined) {
    const idle = renderManifestRegistry.requireDefaultActor().animations.idle;
    return {
      image: idle.assetPath,
      spriteSheet: true,
      frameWidth: idle.frameWidth,
      frameHeight: idle.frameHeight,
      frameCount: idle.endFrame - idle.startFrame + 1,
    };
  }

  return {
    image: "/assets/hero-knight-pixel-v1.png",
    spriteSheet: false,
  };
}

import { resolveEquipmentPresentation } from "../../data/equipmentPresentation";
import { renderManifestRegistry } from "../../game/render/defaultRenderManifestRegistry";
import type { ActorRenderManifest } from "../../game/render/RenderManifest";

export type HeroIdlePresentation = {
  readonly image: string;
  readonly spriteSheet: false;
} | {
  readonly image: string;
  readonly spriteSheet: true;
  readonly frameWidth: number;
  readonly frameHeight: number;
  readonly frameCount: number;
  readonly frameIndex: number;
};

function buildIdlePresentation(manifest: ActorRenderManifest): HeroIdlePresentation {
  const idle = manifest.animations.idle;
  const attack = manifest.animations.attack;
  const sharesAttackSheet = idle.assetPath === attack.assetPath
    && idle.frameWidth === attack.frameWidth
    && idle.frameHeight === attack.frameHeight;
  const lastPhysicalFrame = sharesAttackSheet
    ? Math.max(idle.endFrame, attack.endFrame)
    : idle.endFrame;

  return {
    image: idle.assetPath,
    spriteSheet: true,
    frameWidth: idle.frameWidth,
    frameHeight: idle.frameHeight,
    frameCount: lastPhysicalFrame + 1,
    frameIndex: idle.startFrame,
  };
}

export function getHeroIdleBackgroundPosition(
  presentation: HeroIdlePresentation,
): string | undefined {
  if (!presentation.spriteSheet) return undefined;
  if (presentation.frameCount <= 1) return "0% bottom";
  return `${String((presentation.frameIndex / (presentation.frameCount - 1)) * 100)}% bottom`;
}

export function getEquippedHeroIdlePresentation(
  weaponId: string | undefined,
): HeroIdlePresentation {
  const presentation = resolveEquipmentPresentation(weaponId);
  if (presentation?.actorManifestId !== undefined) {
    const actorManifest = renderManifestRegistry.getActor(presentation.actorManifestId);
    if (actorManifest !== undefined) {
      return buildIdlePresentation(actorManifest);
    }
  }

  if (weaponId !== undefined) {
    return buildIdlePresentation(renderManifestRegistry.requireDefaultActor());
  }

  return {
    image: "/assets/hero-knight-pixel-v1.png",
    spriteSheet: false,
  };
}

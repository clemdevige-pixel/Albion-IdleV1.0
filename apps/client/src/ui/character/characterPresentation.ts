import { resolveEquipmentPresentation } from "../../data/equipmentPresentation";
import { renderManifestRegistry } from "../../game/render/defaultRenderManifestRegistry";
import type { ActorRenderManifest } from "../../game/render/RenderManifest";
import { COMBAT_ACTOR_PRESENTATION_SCALE } from "../../game/render/actorPresentationScale";
import { HERO_TARGET_HEIGHT_PX } from "../../game/render/HeroVisualArchetypeCatalog";

export const CHARACTER_PREVIEW_TARGET_HEIGHT_PX = 200;

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
  readonly displayWidth: number;
  readonly displayHeight: number;
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
    displayWidth: idle.display.width,
    displayHeight: idle.display.height,
  };
}

export function getHeroIdleBackgroundPosition(
  presentation: HeroIdlePresentation,
): string | undefined {
  if (!presentation.spriteSheet) return undefined;
  if (presentation.frameCount <= 1) return "0% bottom";
  return `${String((presentation.frameIndex / (presentation.frameCount - 1)) * 100)}% bottom`;
}

export function getHeroIdlePreviewSize(
  presentation: HeroIdlePresentation,
): { readonly width: number; readonly height: number } | undefined {
  if (!presentation.spriteSheet) return undefined;

  const uiScale = CHARACTER_PREVIEW_TARGET_HEIGHT_PX / HERO_TARGET_HEIGHT_PX;
  return {
    width: presentation.displayWidth * COMBAT_ACTOR_PRESENTATION_SCALE * uiScale,
    height: presentation.displayHeight * COMBAT_ACTOR_PRESENTATION_SCALE * uiScale,
  };
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

import { resolveEquipmentPresentation } from "../../data/equipmentPresentation";
import { renderManifestRegistry } from "../../game/render/defaultRenderManifestRegistry";

export interface HeroIdlePresentation {
  readonly image: string;
  readonly spriteSheet: boolean;
}

export function getEquippedHeroIdlePresentation(
  weaponId: string | undefined,
): HeroIdlePresentation {
  const presentation = resolveEquipmentPresentation(weaponId);
  if (presentation !== undefined) {
    const actorManifest = renderManifestRegistry.getActor(presentation.actorManifestId);
    if (actorManifest !== undefined) {
      return {
        image: actorManifest.animations.idle.assetPath,
        spriteSheet: true,
      };
    }
  }

  if (weaponId !== undefined) {
    return {
      image: "/assets/characters/hero-broadsword-idle-sheet-v1.png",
      spriteSheet: true,
    };
  }

  return {
    image: "/assets/hero-knight-pixel-v1.png",
    spriteSheet: false,
  };
}

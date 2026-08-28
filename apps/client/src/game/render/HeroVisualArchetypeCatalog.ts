import type { WeaponFamilyId } from "../../data/weaponContentCatalog.js";
import type {
  ActorAnimationManifest,
  ActorDisplayManifest,
  ActorOffsetManifest,
  ActorPoseManifest,
} from "./RenderManifest";
import { COMBAT_ACTOR_PRESENTATION_SCALE } from "./actorPresentationScale";

export type HeroVisualArchetypeId = "plate" | "leather" | "cloth";

type SharedAnimationSource = Pick<ActorAnimationManifest, "textureKey" | "assetPath" | "frameRate">;

export interface HeroVisualArchetypeDefinition {
  readonly sheet: {
    readonly frameWidth: number;
    readonly frameHeight: number;
    readonly startFrame: number;
    readonly endFrame: number;
    readonly display: ActorDisplayManifest;
  };
  readonly offset: ActorOffsetManifest;
  readonly walk: SharedAnimationSource;
  readonly death: SharedAnimationSource;
}

/**
 * Visible head-to-feet height in the logical Phaser viewport. This is the
 * single tuning value to adjust after evaluating the first assets in game.
 */
export const HERO_TARGET_HEIGHT_PX = 130;

/**
 * Shared sheets are normalized to 520 opaque source pixels from head to feet.
 * Their 512x640 cells keep 64 transparent pixels below the common baseline.
 */
export const HERO_ARCHETYPE_SOURCE_CHARACTER_HEIGHT_PX = 520;
export const HERO_ARCHETYPE_FRAME_WIDTH_PX = 512;
export const HERO_ARCHETYPE_FRAME_HEIGHT_PX = 640;
export const HERO_ARCHETYPE_FEET_MARGIN_PX = 64;

const HERO_BASE_OFFSET_Y = 58;
const sourceToManifestScale =
  HERO_TARGET_HEIGHT_PX /
  HERO_ARCHETYPE_SOURCE_CHARACTER_HEIGHT_PX /
  COMBAT_ACTOR_PRESENTATION_SCALE;
const sourceToLogicalScale = HERO_TARGET_HEIGHT_PX / HERO_ARCHETYPE_SOURCE_CHARACTER_HEIGHT_PX;

const SHARED_SHEET = {
  frameWidth: HERO_ARCHETYPE_FRAME_WIDTH_PX,
  frameHeight: HERO_ARCHETYPE_FRAME_HEIGHT_PX,
  startFrame: 0,
  endFrame: 5,
  display: {
    width: HERO_ARCHETYPE_FRAME_WIDTH_PX * sourceToManifestScale,
    height: HERO_ARCHETYPE_FRAME_HEIGHT_PX * sourceToManifestScale,
  },
} as const;

const SHARED_OFFSET = {
  x: 0,
  y: HERO_BASE_OFFSET_Y + HERO_ARCHETYPE_FEET_MARGIN_PX * sourceToLogicalScale,
} as const;

export const HERO_VISUAL_ARCHETYPE_BY_WEAPON_FAMILY: Readonly<
  Record<WeaponFamilyId, HeroVisualArchetypeId>
> = {
  sword: "plate",
  bow: "leather",
  fire_staff: "cloth",
  gloves: "plate",
  dagger: "leather",
};

export const HERO_VISUAL_ARCHETYPES: Readonly<
  Record<HeroVisualArchetypeId, HeroVisualArchetypeDefinition>
> = {
  plate: {
    sheet: SHARED_SHEET,
    offset: SHARED_OFFSET,
    walk: {
      textureKey: "hero-archetype-plate-walk-sheet-v1",
      assetPath: "/assets/characters/hero-archetype-plate-walk-sheet-v1.png",
      frameRate: 10,
    },
    death: {
      textureKey: "hero-archetype-plate-death-sheet-v1",
      assetPath: "/assets/characters/hero-archetype-plate-death-sheet-v1.png",
      frameRate: 8,
    },
  },
  leather: {
    sheet: SHARED_SHEET,
    offset: SHARED_OFFSET,
    walk: {
      textureKey: "hero-archetype-leather-walk-sheet-v1",
      assetPath: "/assets/characters/hero-archetype-leather-walk-sheet-v1.png",
      frameRate: 10,
    },
    death: {
      textureKey: "hero-archetype-leather-death-sheet-v1",
      assetPath: "/assets/characters/hero-archetype-leather-death-sheet-v1.png",
      frameRate: 8,
    },
  },
  cloth: {
    sheet: SHARED_SHEET,
    offset: SHARED_OFFSET,
    walk: {
      textureKey: "hero-archetype-cloth-walk-sheet-v1",
      assetPath: "/assets/characters/hero-archetype-cloth-walk-sheet-v1.png",
      frameRate: 10,
    },
    death: {
      textureKey: "hero-archetype-cloth-death-sheet-v1",
      assetPath: "/assets/characters/hero-archetype-cloth-death-sheet-v1.png",
      frameRate: 8,
    },
  },
};

export function requireHeroVisualArchetype(
  familyId: WeaponFamilyId,
): HeroVisualArchetypeDefinition {
  return HERO_VISUAL_ARCHETYPES[HERO_VISUAL_ARCHETYPE_BY_WEAPON_FAMILY[familyId]];
}

export function buildSharedHeroDeathPose(familyId: WeaponFamilyId): ActorPoseManifest {
  const archetype = requireHeroVisualArchetype(familyId);
  return {
    ...archetype.death,
    ...archetype.sheet,
    repeat: 0,
    offset: archetype.offset,
  };
}

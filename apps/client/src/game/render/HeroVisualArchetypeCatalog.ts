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

interface NormalizedAnimationSource extends SharedAnimationSource {
  readonly sourceCharacterHeight: number;
}

export interface HeroVisualArchetypeDefinition {
  readonly sheet: {
    readonly frameWidth: number;
    readonly frameHeight: number;
    readonly startFrame: number;
    readonly endFrame: number;
  };
  readonly walk: NormalizedAnimationSource;
  readonly death: NormalizedAnimationSource;
}

/**
 * Visible head-to-feet height in the logical Phaser viewport. This is the
 * single tuning value to adjust after evaluating the first assets in game.
 */
export const HERO_TARGET_HEIGHT_PX = 130;

/**
 * Walk sheets are normalized to 520 opaque source pixels from head to feet.
 * Death sheets keep their authored proportions and declare their measured
 * standing reference height separately. Every 512x640 cell shares the same
 * 64-pixel baseline margin.
 */
export const HERO_ARCHETYPE_SOURCE_CHARACTER_HEIGHT_PX = 520;
export const HERO_ARCHETYPE_FRAME_WIDTH_PX = 512;
export const HERO_ARCHETYPE_FRAME_HEIGHT_PX = 640;
export const HERO_ARCHETYPE_FEET_MARGIN_PX = 64;
export const HERO_DEATH_SOURCE_CHARACTER_HEIGHT_PX: Readonly<
  Record<HeroVisualArchetypeId, number>
> = {
  plate: 398,
  leather: 353,
  cloth: 383,
};

const HERO_BASE_OFFSET_Y = 58;
const SHARED_SHEET = {
  frameWidth: HERO_ARCHETYPE_FRAME_WIDTH_PX,
  frameHeight: HERO_ARCHETYPE_FRAME_HEIGHT_PX,
  startFrame: 0,
  endFrame: 5,
} as const;

function buildNormalizedDisplay(sourceCharacterHeight: number): ActorDisplayManifest {
  const scale = HERO_TARGET_HEIGHT_PX / sourceCharacterHeight / COMBAT_ACTOR_PRESENTATION_SCALE;
  return {
    width: HERO_ARCHETYPE_FRAME_WIDTH_PX * scale,
    height: HERO_ARCHETYPE_FRAME_HEIGHT_PX * scale,
  };
}

function buildNormalizedOffset(sourceCharacterHeight: number): ActorOffsetManifest {
  return {
    x: 0,
    y:
      HERO_BASE_OFFSET_Y +
      HERO_ARCHETYPE_FEET_MARGIN_PX * (HERO_TARGET_HEIGHT_PX / sourceCharacterHeight),
  };
}

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
    walk: {
      textureKey: "hero-archetype-plate-walk-sheet-v1",
      assetPath: "/assets/characters/hero-archetype-plate-walk-sheet-v1.png",
      frameRate: 10,
      sourceCharacterHeight: HERO_ARCHETYPE_SOURCE_CHARACTER_HEIGHT_PX,
    },
    death: {
      textureKey: "hero-archetype-plate-death-sheet-v1",
      assetPath: "/assets/characters/hero-archetype-plate-death-sheet-v1.png",
      frameRate: 8,
      sourceCharacterHeight: HERO_DEATH_SOURCE_CHARACTER_HEIGHT_PX.plate,
    },
  },
  leather: {
    sheet: SHARED_SHEET,
    walk: {
      textureKey: "hero-archetype-leather-walk-sheet-v1",
      assetPath: "/assets/characters/hero-archetype-leather-walk-sheet-v1.png",
      frameRate: 10,
      sourceCharacterHeight: HERO_ARCHETYPE_SOURCE_CHARACTER_HEIGHT_PX,
    },
    death: {
      textureKey: "hero-archetype-leather-death-sheet-v1",
      assetPath: "/assets/characters/hero-archetype-leather-death-sheet-v1.png",
      frameRate: 8,
      sourceCharacterHeight: HERO_DEATH_SOURCE_CHARACTER_HEIGHT_PX.leather,
    },
  },
  cloth: {
    sheet: SHARED_SHEET,
    walk: {
      textureKey: "hero-archetype-cloth-walk-sheet-v1",
      assetPath: "/assets/characters/hero-archetype-cloth-walk-sheet-v1.png",
      frameRate: 10,
      sourceCharacterHeight: HERO_ARCHETYPE_SOURCE_CHARACTER_HEIGHT_PX,
    },
    death: {
      textureKey: "hero-archetype-cloth-death-sheet-v1",
      assetPath: "/assets/characters/hero-archetype-cloth-death-sheet-v1.png",
      frameRate: 8,
      sourceCharacterHeight: HERO_DEATH_SOURCE_CHARACTER_HEIGHT_PX.cloth,
    },
  },
};

export function requireHeroVisualArchetype(
  familyId: WeaponFamilyId,
): HeroVisualArchetypeDefinition {
  return HERO_VISUAL_ARCHETYPES[HERO_VISUAL_ARCHETYPE_BY_WEAPON_FAMILY[familyId]];
}

export function buildSharedHeroWalkAnimation(familyId: WeaponFamilyId): ActorAnimationManifest {
  const archetype = requireHeroVisualArchetype(familyId);
  const { sourceCharacterHeight, ...walk } = archetype.walk;
  return {
    ...walk,
    ...archetype.sheet,
    display: buildNormalizedDisplay(sourceCharacterHeight),
    repeat: -1,
    offset: buildNormalizedOffset(sourceCharacterHeight),
  };
}

export function buildSharedHeroDeathPose(familyId: WeaponFamilyId): ActorPoseManifest {
  const archetype = requireHeroVisualArchetype(familyId);
  const { sourceCharacterHeight, ...death } = archetype.death;
  return {
    ...death,
    ...archetype.sheet,
    display: buildNormalizedDisplay(sourceCharacterHeight),
    repeat: 0,
    offset: buildNormalizedOffset(sourceCharacterHeight),
  };
}

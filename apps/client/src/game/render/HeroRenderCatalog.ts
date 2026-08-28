import type { WeaponFamilyId } from "../../data/weaponContentCatalog.js";
import type {
  ActorDisplayManifest,
  ActorOffsetManifest,
  ActorRenderManifest,
} from "./RenderManifest";
import {
  buildNormalizedHeroDisplay,
  buildNormalizedHeroOffset,
  buildSharedHeroDeathPose,
  buildSharedHeroWalkAnimation,
  HERO_ARCHETYPE_FEET_MARGIN_PX,
} from "./HeroVisualArchetypeCatalog";

type HeroAnimationSource = {
  readonly textureKey: string;
  readonly assetPath: string;
  readonly frameRate: number;
  readonly startFrame?: number;
  readonly endFrame?: number;
};

type HeroSheetProfile = {
  readonly frameWidth: number;
  readonly frameHeight: number;
  readonly startFrame: number;
  readonly endFrame: number;
  readonly display: ActorDisplayManifest;
  readonly offset?: ActorOffsetManifest;
};

type HeroRenderDefinition = {
  readonly id: string;
  readonly familyId: WeaponFamilyId;
  readonly offset: { readonly x: number; readonly y: number };
  readonly sheet: HeroSheetProfile;
  readonly animations: {
    readonly idle: HeroAnimationSource;
    readonly attack: HeroAnimationSource;
  };
  readonly visualProfile: string;
  readonly visualParameters: ActorRenderManifest["visualParameters"];
  readonly ambientMotion: ActorRenderManifest["ambientMotion"];
};

type NormalizedHeroDefinitionOptions = {
  readonly id: string;
  readonly familyId: WeaponFamilyId;
  readonly textureKey: string;
  readonly assetPath: string;
  /** Visible character height from top of head to bottom of feet; weapon/effects excluded. */
  readonly sourceCharacterHeight: number;
  readonly idleFrame: number;
  readonly attackEndFrame?: number;
  readonly attackFrameRate: number;
  readonly visualProfile: string;
  readonly visualParameters: ActorRenderManifest["visualParameters"];
  readonly ambientMotion: ActorRenderManifest["ambientMotion"];
};

const HERO_ORIGIN = { x: 0.5, y: 1 } as const;
const HERO_BASE_OFFSET = { x: 0, y: 58 } as const;
const HERO_ANIMATION_REPEAT = {
  idle: -1,
  walk: -1,
  attack: 0,
} as const;

const STANDARD_SIX_FRAME_SHEET = {
  frameWidth: 512,
  frameHeight: 512,
  startFrame: 0,
  endFrame: 5,
  display: { width: 228.5714285714, height: 228.5714285714 },
} as const satisfies HeroSheetProfile;

function buildNormalizedHeroSheet(
  sourceCharacterHeight: number,
  endFrame = 5,
): HeroSheetProfile {
  return {
    frameWidth: 512,
    frameHeight: 640,
    startFrame: 0,
    endFrame,
    display: buildNormalizedHeroDisplay(512, 640, sourceCharacterHeight),
    offset: buildNormalizedHeroOffset(sourceCharacterHeight, HERO_ARCHETYPE_FEET_MARGIN_PX),
  };
}

function buildAnimation(
  source: HeroAnimationSource,
  sheet: HeroSheetProfile,
  repeat: number,
  offset?: ActorOffsetManifest,
): ActorRenderManifest["animations"]["idle"] {
  const animationOffset = offset ?? sheet.offset;
  return {
    ...source,
    frameWidth: sheet.frameWidth,
    frameHeight: sheet.frameHeight,
    startFrame: source.startFrame ?? sheet.startFrame,
    endFrame: source.endFrame ?? sheet.endFrame,
    repeat,
    display: sheet.display,
    ...(animationOffset === undefined ? {} : { offset: animationOffset }),
  };
}

export function createHeroRenderManifest(definition: HeroRenderDefinition): ActorRenderManifest {
  return {
    schemaVersion: 1,
    id: definition.id,
    kind: "actor",
    origin: HERO_ORIGIN,
    offset: definition.offset,
    animations: {
      idle: buildAnimation(
        definition.animations.idle,
        definition.sheet,
        HERO_ANIMATION_REPEAT.idle,
      ),
      walk: buildSharedHeroWalkAnimation(definition.familyId),
      attack: buildAnimation(
        definition.animations.attack,
        definition.sheet,
        HERO_ANIMATION_REPEAT.attack,
      ),
    },
    poses: {
      death: buildSharedHeroDeathPose(definition.familyId),
    },
    visualProfile: definition.visualProfile,
    visualParameters: definition.visualParameters,
    ambientMotion: definition.ambientMotion,
  };
}

function createNormalizedHeroDefinition(
  options: NormalizedHeroDefinitionOptions,
): HeroRenderDefinition {
  const attackEndFrame = options.attackEndFrame ?? 5;
  return {
    id: options.id,
    familyId: options.familyId,
    offset: HERO_BASE_OFFSET,
    sheet: buildNormalizedHeroSheet(options.sourceCharacterHeight, attackEndFrame),
    animations: {
      idle: {
        textureKey: options.textureKey,
        assetPath: options.assetPath,
        frameRate: 6,
        startFrame: options.idleFrame,
        endFrame: options.idleFrame,
      },
      attack: {
        textureKey: options.textureKey,
        assetPath: options.assetPath,
        frameRate: options.attackFrameRate,
      },
    },
    visualProfile: options.visualProfile,
    visualParameters: options.visualParameters,
    ambientMotion: options.ambientMotion,
  };
}

const MELEE_VISUAL_PARAMETERS = {
  approachDistance: 48,
  motionDurationMs: 140,
  impactDelayMs: 150,
} as const;
const GLOVE_VISUAL_PARAMETERS = {
  approachDistance: 48,
  motionDurationMs: 150,
  impactDelayMs: 235,
} as const;
const PROJECTILE_VISUAL_PARAMETERS = {
  approachDistance: 0,
  motionDurationMs: 0,
  impactDelayMs: 355,
} as const;
const DAGGER_AMBIENT_MOTION = { distance: 4, durationMs: 800, delayMs: 0 } as const;
const GLOVE_AMBIENT_MOTION = { distance: 4, durationMs: 850, delayMs: 0 } as const;
const BOW_AMBIENT_MOTION = { distance: 4, durationMs: 900, delayMs: 0 } as const;
const FIRE_STAFF_AMBIENT_MOTION = { distance: 4, durationMs: 900, delayMs: 0 } as const;

const HERO_RENDER_DEFINITIONS = [
  {
    id: "hero_broadsword",
    familyId: "sword",
    offset: { x: -5, y: 58 },
    sheet: STANDARD_SIX_FRAME_SHEET,
    animations: {
      idle: {
        textureKey: "hero-broadsword-idle-sheet-v2",
        assetPath: "/assets/characters/hero-broadsword-idle-sheet-v1.png",
        frameRate: 6,
      },
      attack: {
        textureKey: "hero-broadsword-attack-sheet-v2",
        assetPath: "/assets/characters/hero-broadsword-attack-sheet-v1.png",
        frameRate: 16,
      },
    },
    visualProfile: "melee",
    visualParameters: {
      approachDistance: 48,
      motionDurationMs: 180,
      impactDelayMs: 220,
    },
    ambientMotion: { distance: 4, durationMs: 900, delayMs: 0 },
  },
  createNormalizedHeroDefinition({
    id: "hero_longbow",
    familyId: "bow",
    textureKey: "hero-longbow-attack-normalized-v1",
    assetPath: "/assets/characters/hero-longbow-attack-normalized-v1.png",
    sourceCharacterHeight: 451,
    idleFrame: 0,
    attackFrameRate: 13,
    visualProfile: "projectile",
    visualParameters: PROJECTILE_VISUAL_PARAMETERS,
    ambientMotion: BOW_AMBIENT_MOTION,
  }),
  createNormalizedHeroDefinition({
    id: "hero_badon",
    familyId: "bow",
    textureKey: "hero-badon-attack-normalized-v1",
    assetPath: "/assets/characters/hero-badon-attack-normalized-v1.png",
    sourceCharacterHeight: 478,
    idleFrame: 0,
    attackFrameRate: 13,
    visualProfile: "projectile",
    visualParameters: PROJECTILE_VISUAL_PARAMETERS,
    ambientMotion: BOW_AMBIENT_MOTION,
  }),
  createNormalizedHeroDefinition({
    id: "hero_wailing",
    familyId: "bow",
    textureKey: "hero-wailing-attack-normalized-v1",
    assetPath: "/assets/characters/hero-wailing-attack-normalized-v1.png",
    sourceCharacterHeight: 451,
    idleFrame: 0,
    attackFrameRate: 13,
    visualProfile: "projectile",
    visualParameters: PROJECTILE_VISUAL_PARAMETERS,
    ambientMotion: BOW_AMBIENT_MOTION,
  }),
  createNormalizedHeroDefinition({
    id: "hero_whispering",
    familyId: "bow",
    textureKey: "hero-whispering-attack-normalized-v1",
    assetPath: "/assets/characters/hero-whispering-attack-normalized-v1.png",
    sourceCharacterHeight: 482,
    idleFrame: 5,
    attackFrameRate: 13,
    visualProfile: "projectile",
    visualParameters: PROJECTILE_VISUAL_PARAMETERS,
    ambientMotion: BOW_AMBIENT_MOTION,
  }),
  createNormalizedHeroDefinition({
    id: "hero_warbow",
    familyId: "bow",
    textureKey: "hero-warbow-attack-normalized-v1",
    assetPath: "/assets/characters/hero-warbow-attack-normalized-v1.png",
    sourceCharacterHeight: 467,
    idleFrame: 0,
    attackFrameRate: 13,
    visualProfile: "projectile",
    visualParameters: PROJECTILE_VISUAL_PARAMETERS,
    ambientMotion: BOW_AMBIENT_MOTION,
  }),
  createNormalizedHeroDefinition({
    id: "hero_infernal",
    familyId: "fire_staff",
    textureKey: "hero-infernal-attack-normalized-v1",
    assetPath: "/assets/characters/hero-infernal-attack-normalized-v1.png",
    sourceCharacterHeight: 375,
    idleFrame: 0,
    attackFrameRate: 13,
    visualProfile: "projectile",
    visualParameters: PROJECTILE_VISUAL_PARAMETERS,
    ambientMotion: FIRE_STAFF_AMBIENT_MOTION,
  }),
  createNormalizedHeroDefinition({
    id: "hero_wildfire",
    familyId: "fire_staff",
    textureKey: "hero-wildfire-attack-normalized-v1",
    assetPath: "/assets/characters/hero-wildfire-attack-normalized-v1.png",
    sourceCharacterHeight: 297,
    idleFrame: 0,
    attackFrameRate: 13,
    visualProfile: "projectile",
    visualParameters: PROJECTILE_VISUAL_PARAMETERS,
    ambientMotion: FIRE_STAFF_AMBIENT_MOTION,
  }),
  createNormalizedHeroDefinition({
    id: "hero_blazing",
    familyId: "fire_staff",
    textureKey: "hero-blazing-attack-normalized-v1",
    assetPath: "/assets/characters/hero-blazing-attack-normalized-v1.png",
    sourceCharacterHeight: 372,
    idleFrame: 0,
    attackFrameRate: 13,
    visualProfile: "projectile",
    visualParameters: PROJECTILE_VISUAL_PARAMETERS,
    ambientMotion: FIRE_STAFF_AMBIENT_MOTION,
  }),
  createNormalizedHeroDefinition({
    id: "hero_brimstone",
    familyId: "fire_staff",
    textureKey: "hero-brimstone-attack-normalized-v1",
    assetPath: "/assets/characters/hero-brimstone-attack-normalized-v1.png",
    sourceCharacterHeight: 378,
    idleFrame: 0,
    attackFrameRate: 13,
    visualProfile: "projectile",
    visualParameters: PROJECTILE_VISUAL_PARAMETERS,
    ambientMotion: FIRE_STAFF_AMBIENT_MOTION,
  }),
  createNormalizedHeroDefinition({
    id: "hero_great_fire",
    familyId: "fire_staff",
    textureKey: "hero-great-fire-attack-normalized-v1",
    assetPath: "/assets/characters/hero-great-fire-attack-normalized-v1.png",
    sourceCharacterHeight: 324,
    idleFrame: 0,
    attackFrameRate: 13,
    visualProfile: "projectile",
    visualParameters: PROJECTILE_VISUAL_PARAMETERS,
    ambientMotion: FIRE_STAFF_AMBIENT_MOTION,
  }),
  createNormalizedHeroDefinition({
    id: "hero_spiked_gauntlets",
    familyId: "gloves",
    textureKey: "hero-spiked-attack-normalized-v1",
    assetPath: "/assets/characters/hero-spiked-attack-normalized-v1.png",
    sourceCharacterHeight: 470,
    idleFrame: 0,
    attackFrameRate: 16,
    visualProfile: "melee",
    visualParameters: GLOVE_VISUAL_PARAMETERS,
    ambientMotion: GLOVE_AMBIENT_MOTION,
  }),
  createNormalizedHeroDefinition({
    id: "hero_ursine_maulers",
    familyId: "gloves",
    textureKey: "hero-ursine-attack-normalized-v1",
    assetPath: "/assets/characters/hero-ursine-attack-normalized-v1.png",
    sourceCharacterHeight: 487,
    idleFrame: 0,
    attackFrameRate: 16,
    visualProfile: "melee",
    visualParameters: GLOVE_VISUAL_PARAMETERS,
    ambientMotion: GLOVE_AMBIENT_MOTION,
  }),
  createNormalizedHeroDefinition({
    id: "hero_battle_bracers",
    familyId: "gloves",
    textureKey: "hero-battle-bracers-attack-normalized-v1",
    assetPath: "/assets/characters/hero-battle-bracers-attack-normalized-v1.png",
    sourceCharacterHeight: 478,
    idleFrame: 0,
    attackFrameRate: 16,
    visualProfile: "melee",
    visualParameters: GLOVE_VISUAL_PARAMETERS,
    ambientMotion: GLOVE_AMBIENT_MOTION,
  }),
  createNormalizedHeroDefinition({
    id: "hero_hellfire_hands",
    familyId: "gloves",
    textureKey: "hero-hellfire-hands-attack-normalized-v1",
    assetPath: "/assets/characters/hero-hellfire-hands-attack-normalized-v1.png",
    sourceCharacterHeight: 415,
    idleFrame: 0,
    attackFrameRate: 16,
    visualProfile: "melee",
    visualParameters: GLOVE_VISUAL_PARAMETERS,
    ambientMotion: GLOVE_AMBIENT_MOTION,
  }),
  createNormalizedHeroDefinition({
    id: "hero_ravenstrike_cestus",
    familyId: "gloves",
    textureKey: "hero-ravenstrike-cestus-attack-normalized-v1",
    assetPath: "/assets/characters/hero-ravenstrike-cestus-attack-normalized-v1.png",
    sourceCharacterHeight: 475,
    idleFrame: 0,
    attackFrameRate: 16,
    visualProfile: "melee",
    visualParameters: GLOVE_VISUAL_PARAMETERS,
    ambientMotion: GLOVE_AMBIENT_MOTION,
  }),
  createNormalizedHeroDefinition({
    id: "hero_dagger_pair",
    familyId: "dagger",
    textureKey: "hero-dual-dagger-attack-normalized-v2",
    assetPath: "/assets/characters/hero-dual-dagger-attack-normalized-v2.png",
    sourceCharacterHeight: 397,
    idleFrame: 0,
    attackFrameRate: 16,
    visualProfile: "melee",
    visualParameters: MELEE_VISUAL_PARAMETERS,
    ambientMotion: DAGGER_AMBIENT_MOTION,
  }),
  createNormalizedHeroDefinition({
    id: "hero_bloodletter",
    familyId: "dagger",
    textureKey: "hero-bloodletter-attack-normalized-v1",
    assetPath: "/assets/characters/hero-bloodletter-attack-normalized-v1.png",
    sourceCharacterHeight: 388,
    idleFrame: 0,
    attackFrameRate: 16,
    visualProfile: "melee",
    visualParameters: MELEE_VISUAL_PARAMETERS,
    ambientMotion: DAGGER_AMBIENT_MOTION,
  }),
  createNormalizedHeroDefinition({
    id: "hero_demonfang",
    familyId: "dagger",
    textureKey: "hero-demonfang-attack-normalized-v1",
    assetPath: "/assets/characters/hero-demonfang-attack-normalized-v1.png",
    sourceCharacterHeight: 398,
    idleFrame: 5,
    attackFrameRate: 16,
    visualProfile: "melee",
    visualParameters: MELEE_VISUAL_PARAMETERS,
    ambientMotion: DAGGER_AMBIENT_MOTION,
  }),
  createNormalizedHeroDefinition({
    id: "hero_deathgivers",
    familyId: "dagger",
    textureKey: "hero-deathgiver-attack-normalized-v1",
    assetPath: "/assets/characters/hero-deathgiver-attack-normalized-v1.png",
    sourceCharacterHeight: 414,
    idleFrame: 5,
    attackFrameRate: 16,
    visualProfile: "melee",
    visualParameters: MELEE_VISUAL_PARAMETERS,
    ambientMotion: DAGGER_AMBIENT_MOTION,
  }),
  createNormalizedHeroDefinition({
    id: "hero_claws",
    familyId: "dagger",
    textureKey: "hero-claw-attack-normalized-v1",
    assetPath: "/assets/characters/hero-claw-attack-normalized-v1.png",
    sourceCharacterHeight: 525,
    idleFrame: 0,
    attackEndFrame: 4,
    attackFrameRate: 16,
    visualProfile: "melee",
    visualParameters: MELEE_VISUAL_PARAMETERS,
    ambientMotion: DAGGER_AMBIENT_MOTION,
  }),
] as const satisfies readonly HeroRenderDefinition[];

export const HERO_RENDER_MANIFESTS: readonly ActorRenderManifest[] =
  HERO_RENDER_DEFINITIONS.map(createHeroRenderManifest);

export function requireHeroRenderManifest(id: string): ActorRenderManifest {
  const manifest = HERO_RENDER_MANIFESTS.find((candidate) => candidate.id === id);
  if (manifest === undefined) {
    throw new Error(`Unknown hero render manifest: ${id}`);
  }
  return manifest;
}

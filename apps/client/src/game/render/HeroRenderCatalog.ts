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

const HERO_ORIGIN = { x: 0.5, y: 1 } as const;
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

const DUAL_DAGGER_SHEET = buildNormalizedHeroSheet(397);
const BLOODLETTER_SHEET = buildNormalizedHeroSheet(388);
const DEMONFANG_SHEET = buildNormalizedHeroSheet(398);
const DEATHGIVERS_SHEET = buildNormalizedHeroSheet(414);
const CLAWS_SHEET = buildNormalizedHeroSheet(525, 4);

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
  {
    id: "hero_longbow",
    familyId: "bow",
    offset: { x: 11, y: 58 },
    sheet: STANDARD_SIX_FRAME_SHEET,
    animations: {
      idle: {
        textureKey: "hero-longbow-idle-sheet-v1",
        assetPath: "/assets/characters/hero-longbow-idle-sheet-v1.png",
        frameRate: 6,
      },
      attack: {
        textureKey: "hero-longbow-attack-sheet-v1",
        assetPath: "/assets/characters/hero-longbow-attack-sheet-v1.png",
        frameRate: 13,
      },
    },
    visualProfile: "projectile",
    visualParameters: {
      approachDistance: 0,
      motionDurationMs: 0,
      impactDelayMs: 355,
    },
    ambientMotion: { distance: 4, durationMs: 900, delayMs: 0 },
  },
  {
    id: "hero_bow",
    familyId: "bow",
    offset: { x: 0, y: 58 },
    sheet: {
      frameWidth: 420,
      frameHeight: 330,
      startFrame: 0,
      endFrame: 6,
      display: { width: 220, height: 200 },
    },
    animations: {
      idle: {
        textureKey: "hero-badon-idle-sheet",
        assetPath: "/assets/characters/hero-badon-idle-sheet-v1.png",
        frameRate: 6,
      },
      attack: {
        textureKey: "hero-badon-attack-sheet",
        assetPath: "/assets/characters/hero-badon-attack-sheet-v1.png",
        frameRate: 13,
      },
    },
    visualProfile: "projectile",
    visualParameters: {
      approachDistance: 0,
      motionDurationMs: 0,
      impactDelayMs: 355,
    },
    ambientMotion: { distance: 4, durationMs: 900, delayMs: 0 },
  },
  {
    id: "hero_fire_staff",
    familyId: "fire_staff",
    offset: { x: 30, y: 58 },
    sheet: STANDARD_SIX_FRAME_SHEET,
    animations: {
      idle: {
        textureKey: "hero-fire-staff-idle-sheet-v5",
        assetPath: "/assets/characters/hero-fire-staff-idle-sheet-v1.png",
        frameRate: 6,
      },
      attack: {
        textureKey: "hero-fire-staff-attack-sheet-v4",
        assetPath: "/assets/characters/hero-fire-staff-attack-sheet-v1.png",
        frameRate: 13,
      },
    },
    visualProfile: "projectile",
    visualParameters: {
      approachDistance: 0,
      motionDurationMs: 0,
      impactDelayMs: 355,
    },
    ambientMotion: { distance: 4, durationMs: 900, delayMs: 0 },
  },
  {
    id: "hero_spiked_gauntlets",
    familyId: "gloves",
    offset: { x: 0, y: 58 },
    sheet: STANDARD_SIX_FRAME_SHEET,
    animations: {
      idle: {
        textureKey: "hero-spiked-gauntlets-idle-sheet-v2",
        assetPath: "/assets/characters/hero-spiked-gauntlets-idle-sheet-v1.png",
        frameRate: 6,
      },
      attack: {
        textureKey: "hero-spiked-gauntlets-attack-sheet-v2",
        assetPath: "/assets/characters/hero-spiked-gauntlets-attack-sheet-v1.png",
        frameRate: 16,
      },
    },
    visualProfile: "melee",
    visualParameters: {
      approachDistance: 48,
      motionDurationMs: 150,
      impactDelayMs: 235,
    },
    ambientMotion: { distance: 4, durationMs: 850, delayMs: 0 },
  },
  {
    id: "hero_dagger_pair",
    familyId: "dagger",
    offset: { x: 0, y: 58 },
    sheet: DUAL_DAGGER_SHEET,
    animations: {
      idle: {
        textureKey: "hero-dual-dagger-attack-normalized-v2",
        assetPath: "/assets/characters/hero-dual-dagger-attack-normalized-v2.png",
        frameRate: 6,
        startFrame: 0,
        endFrame: 0,
      },
      attack: {
        textureKey: "hero-dual-dagger-attack-normalized-v2",
        assetPath: "/assets/characters/hero-dual-dagger-attack-normalized-v2.png",
        frameRate: 16,
      },
    },
    visualProfile: "melee",
    visualParameters: {
      approachDistance: 48,
      motionDurationMs: 140,
      impactDelayMs: 150,
    },
    ambientMotion: { distance: 4, durationMs: 800, delayMs: 0 },
  },
  {
    id: "hero_bloodletter",
    familyId: "dagger",
    offset: { x: 0, y: 58 },
    sheet: BLOODLETTER_SHEET,
    animations: {
      idle: {
        textureKey: "hero-bloodletter-attack-normalized-v1",
        assetPath: "/assets/characters/hero-bloodletter-attack-normalized-v1.png",
        frameRate: 6,
        startFrame: 0,
        endFrame: 0,
      },
      attack: {
        textureKey: "hero-bloodletter-attack-normalized-v1",
        assetPath: "/assets/characters/hero-bloodletter-attack-normalized-v1.png",
        frameRate: 16,
      },
    },
    visualProfile: "melee",
    visualParameters: {
      approachDistance: 48,
      motionDurationMs: 140,
      impactDelayMs: 150,
    },
    ambientMotion: { distance: 4, durationMs: 800, delayMs: 0 },
  },
  {
    id: "hero_demonfang",
    familyId: "dagger",
    offset: { x: 0, y: 58 },
    sheet: DEMONFANG_SHEET,
    animations: {
      idle: {
        textureKey: "hero-demonfang-attack-normalized-v1",
        assetPath: "/assets/characters/hero-demonfang-attack-normalized-v1.png",
        frameRate: 6,
        startFrame: 5,
        endFrame: 5,
      },
      attack: {
        textureKey: "hero-demonfang-attack-normalized-v1",
        assetPath: "/assets/characters/hero-demonfang-attack-normalized-v1.png",
        frameRate: 16,
      },
    },
    visualProfile: "melee",
    visualParameters: {
      approachDistance: 48,
      motionDurationMs: 140,
      impactDelayMs: 150,
    },
    ambientMotion: { distance: 4, durationMs: 800, delayMs: 0 },
  },
  {
    id: "hero_deathgivers",
    familyId: "dagger",
    offset: { x: 0, y: 58 },
    sheet: DEATHGIVERS_SHEET,
    animations: {
      idle: {
        textureKey: "hero-deathgiver-attack-normalized-v1",
        assetPath: "/assets/characters/hero-deathgiver-attack-normalized-v1.png",
        frameRate: 6,
        startFrame: 5,
        endFrame: 5,
      },
      attack: {
        textureKey: "hero-deathgiver-attack-normalized-v1",
        assetPath: "/assets/characters/hero-deathgiver-attack-normalized-v1.png",
        frameRate: 16,
      },
    },
    visualProfile: "melee",
    visualParameters: {
      approachDistance: 48,
      motionDurationMs: 140,
      impactDelayMs: 150,
    },
    ambientMotion: { distance: 4, durationMs: 800, delayMs: 0 },
  },
  {
    id: "hero_claws",
    familyId: "dagger",
    offset: { x: 0, y: 58 },
    sheet: CLAWS_SHEET,
    animations: {
      idle: {
        textureKey: "hero-claw-attack-normalized-v1",
        assetPath: "/assets/characters/hero-claw-attack-normalized-v1.png",
        frameRate: 6,
        startFrame: 0,
        endFrame: 0,
      },
      attack: {
        textureKey: "hero-claw-attack-normalized-v1",
        assetPath: "/assets/characters/hero-claw-attack-normalized-v1.png",
        frameRate: 16,
      },
    },
    visualProfile: "melee",
    visualParameters: {
      approachDistance: 48,
      motionDurationMs: 140,
      impactDelayMs: 150,
    },
    ambientMotion: { distance: 4, durationMs: 800, delayMs: 0 },
  },
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

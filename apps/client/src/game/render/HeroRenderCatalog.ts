import type {
  ActorDisplayManifest,
  ActorRenderManifest,
} from "./RenderManifest";

type HeroAnimationSource = {
  readonly textureKey: string;
  readonly assetPath: string;
  readonly frameRate: number;
};

type HeroSheetProfile = {
  readonly frameWidth: number;
  readonly frameHeight: number;
  readonly startFrame: number;
  readonly endFrame: number;
  readonly display: ActorDisplayManifest;
};

type HeroDeathSource = {
  readonly textureKey: string;
  readonly assetPath: string;
  readonly frameRate?: number;
};

type HeroRenderDefinition = {
  readonly id: string;
  readonly offset: { readonly x: number; readonly y: number };
  readonly sheet: HeroSheetProfile;
  readonly animations: {
    readonly idle: HeroAnimationSource;
    readonly walk: HeroAnimationSource;
    readonly attack: HeroAnimationSource;
  };
  readonly death: HeroDeathSource;
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
const HERO_DEATH_REPEAT = 0;

const STANDARD_SIX_FRAME_SHEET = {
  frameWidth: 512,
  frameHeight: 512,
  startFrame: 0,
  endFrame: 5,
  display: { width: 228.5714285714, height: 228.5714285714 },
} as const satisfies HeroSheetProfile;

function buildAnimation(
  source: HeroAnimationSource,
  sheet: HeroSheetProfile,
  repeat: number,
): ActorRenderManifest["animations"]["idle"] {
  return {
    ...source,
    frameWidth: sheet.frameWidth,
    frameHeight: sheet.frameHeight,
    startFrame: sheet.startFrame,
    endFrame: sheet.endFrame,
    repeat,
    display: sheet.display,
  };
}

export function createHeroRenderManifest(
  definition: HeroRenderDefinition,
): ActorRenderManifest {
  const animatedDeath = definition.death.frameRate !== undefined;

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
      walk: buildAnimation(
        definition.animations.walk,
        definition.sheet,
        HERO_ANIMATION_REPEAT.walk,
      ),
      attack: buildAnimation(
        definition.animations.attack,
        definition.sheet,
        HERO_ANIMATION_REPEAT.attack,
      ),
    },
    poses: {
      death: {
        textureKey: definition.death.textureKey,
        assetPath: definition.death.assetPath,
        display: definition.sheet.display,
        ...(animatedDeath
          ? {
              frameWidth: definition.sheet.frameWidth,
              frameHeight: definition.sheet.frameHeight,
              startFrame: definition.sheet.startFrame,
              endFrame: definition.sheet.endFrame,
              frameRate: definition.death.frameRate,
              repeat: HERO_DEATH_REPEAT,
            }
          : {}),
      },
    },
    visualProfile: definition.visualProfile,
    visualParameters: definition.visualParameters,
    ambientMotion: definition.ambientMotion,
  };
}

const HERO_RENDER_DEFINITIONS = [
  {
    id: "hero_broadsword",
    offset: { x: -5, y: 58 },
    sheet: STANDARD_SIX_FRAME_SHEET,
    animations: {
      idle: {
        textureKey: "hero-broadsword-idle-sheet-v2",
        assetPath: "/assets/characters/hero-broadsword-idle-sheet-v1.png",
        frameRate: 6,
      },
      walk: {
        textureKey: "hero-broadsword-walk-sheet-v2",
        assetPath: "/assets/characters/hero-broadsword-walk-sheet-v1.png",
        frameRate: 10,
      },
      attack: {
        textureKey: "hero-broadsword-attack-sheet-v2",
        assetPath: "/assets/characters/hero-broadsword-attack-sheet-v1.png",
        frameRate: 16,
      },
    },
    death: {
      textureKey: "hero-broadsword-death-sheet-v2",
      assetPath: "/assets/characters/hero-broadsword-death-v2.png",
      frameRate: 8,
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
    offset: { x: 11, y: 58 },
    sheet: STANDARD_SIX_FRAME_SHEET,
    animations: {
      idle: {
        textureKey: "hero-longbow-idle-sheet-v1",
        assetPath: "/assets/characters/hero-longbow-idle-sheet-v1.png",
        frameRate: 6,
      },
      walk: {
        textureKey: "hero-longbow-walk-sheet-v1",
        assetPath: "/assets/characters/hero-longbow-walk-sheet-v1.png",
        frameRate: 10,
      },
      attack: {
        textureKey: "hero-longbow-attack-sheet-v1",
        assetPath: "/assets/characters/hero-longbow-attack-sheet-v1.png",
        frameRate: 13,
      },
    },
    death: {
      textureKey: "hero-longbow-death-sheet-v1",
      assetPath: "/assets/characters/hero-longbow-death-sheet-v1.png",
      frameRate: 8,
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
      walk: {
        textureKey: "hero-badon-walk-sheet",
        assetPath: "/assets/characters/hero-badon-walk-sheet-v1.png",
        frameRate: 10,
      },
      attack: {
        textureKey: "hero-badon-attack-sheet",
        assetPath: "/assets/characters/hero-badon-attack-sheet-v1.png",
        frameRate: 13,
      },
    },
    death: {
      textureKey: "hero-badon-death",
      assetPath: "/assets/characters/hero-badon-death-v2.png",
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
    offset: { x: 30, y: 58 },
    sheet: STANDARD_SIX_FRAME_SHEET,
    animations: {
      idle: {
        textureKey: "hero-fire-staff-idle-sheet-v5",
        assetPath: "/assets/characters/hero-fire-staff-idle-sheet-v1.png",
        frameRate: 6,
      },
      walk: {
        textureKey: "hero-fire-staff-walk-sheet-v4",
        assetPath: "/assets/characters/hero-fire-staff-walk-sheet-v1.png",
        frameRate: 10,
      },
      attack: {
        textureKey: "hero-fire-staff-attack-sheet-v4",
        assetPath: "/assets/characters/hero-fire-staff-attack-sheet-v1.png",
        frameRate: 13,
      },
    },
    death: {
      textureKey: "hero-fire-staff-death-sheet-v4",
      assetPath: "/assets/characters/hero-fire-staff-death-v2.png",
      frameRate: 8,
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
    offset: { x: 0, y: 58 },
    sheet: STANDARD_SIX_FRAME_SHEET,
    animations: {
      idle: {
        textureKey: "hero-spiked-gauntlets-idle-sheet-v2",
        assetPath: "/assets/characters/hero-spiked-gauntlets-idle-sheet-v1.png",
        frameRate: 6,
      },
      walk: {
        textureKey: "hero-spiked-gauntlets-walk-sheet-v2",
        assetPath: "/assets/characters/hero-spiked-gauntlets-walk-sheet-v1.png",
        frameRate: 10,
      },
      attack: {
        textureKey: "hero-spiked-gauntlets-attack-sheet-v2",
        assetPath: "/assets/characters/hero-spiked-gauntlets-attack-sheet-v1.png",
        frameRate: 16,
      },
    },
    death: {
      textureKey: "hero-spiked-gauntlets-death-sheet-v2",
      assetPath: "/assets/characters/hero-spiked-gauntlets-death-v1.png",
      frameRate: 8,
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
    offset: { x: 0, y: 58 },
    sheet: {
      frameWidth: 512,
      frameHeight: 512,
      startFrame: 0,
      endFrame: 5,
      display: { width: 182, height: 182 },
    },
    animations: {
      idle: {
        textureKey: "hero-dagger-pair-idle",
        assetPath: "/assets/characters/hero_dual_dagger_idle.png",
        frameRate: 6,
      },
      walk: {
        textureKey: "hero-dagger-pair-walk",
        assetPath: "/assets/characters/dual_daggers_walk.png",
        frameRate: 10,
      },
      attack: {
        textureKey: "hero-dagger-pair-attack",
        assetPath: "/assets/characters/hero_dual_dagger_attack.png",
        frameRate: 16,
      },
    },
    death: {
      textureKey: "hero-dagger-pair-death",
      assetPath: "/assets/characters/dual_daggers_death.png",
      frameRate: 8,
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

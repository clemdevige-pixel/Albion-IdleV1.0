export const ACTOR_ANIMATION_STATES = ["idle", "walk", "attack"] as const;
export type ActorAnimationState = (typeof ACTOR_ANIMATION_STATES)[number];

export interface ActorDisplayManifest {
  readonly width: number;
  readonly height: number;
}

export interface ActorAmbientMotionManifest {
  readonly distance: number;
  readonly durationMs: number;
  readonly delayMs: number;
}

export interface ActorAnimationManifest {
  readonly textureKey: string;
  readonly assetPath: string;
  readonly frameWidth: number;
  readonly frameHeight: number;
  readonly startFrame: number;
  readonly endFrame: number;
  readonly frameRate: number;
  readonly repeat: number;
  readonly display: ActorDisplayManifest;
}

export interface ActorPoseManifest {
  readonly textureKey: string;
  readonly assetPath: string;
  readonly display: ActorDisplayManifest;
}

export interface ActorRenderManifest {
  readonly schemaVersion: 1;
  readonly id: string;
  readonly kind: "actor";
  readonly origin: {
    readonly x: number;
    readonly y: number;
  };
  readonly offset: {
    readonly x: number;
    readonly y: number;
  };
  readonly animations: Readonly<Record<ActorAnimationState, ActorAnimationManifest>>;
  readonly poses: {
    readonly death: ActorPoseManifest;
  };
  readonly visualProfile: string;
  readonly visualParameters: {
    readonly approachDistance?: number;
    readonly motionDurationMs?: number;
    readonly impactDelayMs?: number;
  };
  readonly ambientMotion: ActorAmbientMotionManifest;
}

export interface StaticActorRenderManifest {
  readonly schemaVersion: 1;
  readonly id: string;
  readonly kind: "static_actor";
  readonly textureKey: string;
  readonly assetPath: string;
  readonly origin: {
    readonly x: number;
    readonly y: number;
  };
  readonly offset: {
    readonly x: number;
    readonly y: number;
  };
  readonly display: ActorDisplayManifest;
  readonly hud: {
    readonly healthBarWidth: number;
    readonly healthBarOffsetY: number;
  };
  readonly ambientMotion: ActorAmbientMotionManifest;
}

export interface ResourceNodeRenderManifest {
  readonly schemaVersion: 1;
  readonly id: string;
  readonly kind: "resource_node";
  readonly textureKey: string;
  readonly assetPath: string;
  readonly origin: { readonly x: number; readonly y: number };
  readonly offset: { readonly x: number; readonly y: number };
  readonly display: ActorDisplayManifest;
}

export interface ProjectileImpactEffectManifest {
  readonly shape: "circle";
  readonly radius: number;
  readonly fillColor: string;
  readonly fillAlpha: number;
  readonly strokeWidth: number;
  readonly strokeColor: string;
  readonly depth: number;
  readonly durationMs: number;
  readonly endScale: number;
}

export interface ProjectileRenderManifest {
  readonly schemaVersion: 1;
  readonly id: string;
  readonly kind: "projectile";
  readonly shape:
    | {
        readonly type: "rectangle";
        readonly width: number;
        readonly height: number;
      }
    | {
        readonly type: "circle";
        readonly radius: number;
      };
  readonly fillColor: string;
  readonly strokeWidth: number;
  readonly strokeColor: string;
  readonly blendMode: "normal" | "add";
  readonly depth: number;
  readonly durationMs: number;
  readonly endScale: number;
  readonly trajectory: {
    readonly type: "linear";
    readonly sourceOffsetX: number;
    readonly targetOffsetX: number;
    readonly offsetY: number;
  };
  readonly impactEffect?: ProjectileImpactEffectManifest;
}

export interface FloatingTextRenderManifest {
  readonly schemaVersion: 1;
  readonly id: string;
  readonly kind: "floating_text";
  readonly textStyle: {
    readonly fontFamily: string;
    readonly fontSize: number;
    readonly fontStyle: string;
    readonly color: string;
    readonly strokeColor: string;
    readonly strokeThickness: number;
  };
  readonly motion: {
    readonly randomOffsetX: number;
    readonly riseDistance: number;
    readonly startScale: number;
    readonly endScale: number;
    readonly durationMs: number;
    readonly ease: string;
  };
  readonly depth: number;
}

export interface WorldHudRenderManifest {
  readonly schemaVersion: 1;
  readonly id: string;
  readonly kind: "world_hud";
  readonly healthBar: {
    readonly defaultWidth: number;
    readonly height: number;
    readonly offsetY: number;
    readonly backgroundColor: string;
    readonly borderColor: string;
    readonly borderWidth: number;
    readonly backgroundDepth: number;
    readonly fillDepth: number;
    readonly lowerGradient: readonly [string, string];
    readonly upperGradient: readonly [string, string];
  };
  readonly valueText: {
    readonly offsetY: number;
    readonly fontFamily: string;
    readonly fontSize: number;
    readonly fontStyle: string;
    readonly color: string;
    readonly strokeColor: string;
    readonly strokeThickness: number;
    readonly depth: number;
  };
  readonly actorLabel: {
    readonly offsetY: number;
    readonly fontFamily: string;
    readonly fontSize: number;
    readonly fontStyle: string;
    readonly playerColor: string;
    readonly enemyColor: string;
    readonly letterSpacing: number;
    readonly depth: number;
  };
}

export interface WorldStatusTextManifest {
  readonly xRatio: number;
  readonly y: number;
  readonly fontFamily: string;
  readonly fontSize: number;
  readonly fontStyle: string;
  readonly color: string;
  readonly align: "left" | "center" | "right";
  readonly strokeColor: string;
  readonly strokeThickness: number;
  readonly depth: number;
}

export interface WorldStatusRenderManifest {
  readonly schemaVersion: 1;
  readonly id: string;
  readonly kind: "world_status";
  readonly zoneText: WorldStatusTextManifest;
  readonly segmentText: WorldStatusTextManifest;
  readonly stateText: WorldStatusTextManifest;
}

export interface EnvironmentPaletteManifest {
  readonly sky: string;
  readonly ground: string;
  readonly groundLine: string;
}

export interface EnvironmentRenderManifest {
  readonly schemaVersion: 1;
  readonly id: string;
  readonly kind: "environment";
  readonly textureKey: string;
  readonly assetPath: string;
  readonly pixelArt: boolean;
  readonly defaultPalette: EnvironmentPaletteManifest;
  readonly biomePalettes: Readonly<Record<string, EnvironmentPaletteManifest>>;
  readonly layout: {
    readonly skyHeightRatio: number;
    readonly skyYRatio: number;
    readonly groundHeightRatio: number;
    readonly groundYRatio: number;
    readonly groundLineYRatio: number;
    readonly actorShadowWidth: number;
    readonly actorShadowHeight: number;
    readonly actorShadowYRatio: number;
  };
}

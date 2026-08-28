import {
  ACTOR_ANIMATION_STATES,
  type ActorAnimationManifest,
  type ActorRenderManifest,
  type EnvironmentPaletteManifest,
  type EnvironmentRenderManifest,
  type FloatingTextRenderManifest,
  type ProjectileRenderManifest,
  type ResourceNodeRenderManifest,
  type StaticActorRenderManifest,
  type WorldHudRenderManifest,
  type WorldStatusRenderManifest,
  type WorldStatusTextManifest,
} from "./RenderManifest";

export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function requireString(
  record: Record<string, unknown>,
  key: string,
  context: string,
): string {
  const value = record[key];

  if (typeof value !== "string" || value.length === 0) {
    throw new Error(`${context}.${key} doit être une chaîne non vide`);
  }

  return value;
}

export function requireNumber(
  record: Record<string, unknown>,
  key: string,
  context: string,
): number {
  const value = record[key];

  if (typeof value !== "number" || !Number.isFinite(value)) {
    throw new Error(`${context}.${key} doit être un nombre fini`);
  }

  return value;
}

function optionalNumber(
  record: Record<string, unknown>,
  key: string,
  context: string,
): number | undefined {
  const value = record[key];

  if (value === undefined) {
    return undefined;
  }

  if (typeof value !== "number" || !Number.isFinite(value)) {
    throw new Error(`${context}.${key} doit être un nombre fini`);
  }

  return value;
}

export function parseDisplay(value: unknown, context: string): { width: number; height: number } {
  if (!isRecord(value)) {
    throw new Error(`${context} doit être un objet`);
  }

  const width = requireNumber(value, "width", context);
  const height = requireNumber(value, "height", context);

  if (width <= 0 || height <= 0) {
    throw new Error(`${context} doit définir des dimensions positives`);
  }

  return { width, height };
}

function parseOptionalOffset(
  value: unknown,
  context: string,
): { x: number; y: number } | undefined {
  if (value === undefined) return undefined;
  if (!isRecord(value)) {
    throw new Error(`${context} doit être un objet`);
  }

  return {
    x: requireNumber(value, "x", context),
    y: requireNumber(value, "y", context),
  };
}

export function parseAmbientMotion(
  value: unknown,
  context: string,
): {
  distance: number;
  durationMs: number;
  delayMs: number;
} {
  if (!isRecord(value)) {
    throw new Error(`${context} doit être un objet`);
  }

  return {
    distance: requireNumber(value, "distance", context),
    durationMs: requireNumber(value, "durationMs", context),
    delayMs: requireNumber(value, "delayMs", context),
  };
}

export function parseWorldStatusText(value: unknown, context: string): WorldStatusTextManifest {
  if (!isRecord(value)) {
    throw new Error(`${context} doit être un objet`);
  }

  const align = requireString(value, "align", context);

  if (align !== "left" && align !== "center" && align !== "right") {
    throw new Error(`${context}.align est invalide`);
  }

  return {
    xRatio: requireNumber(value, "xRatio", context),
    y: requireNumber(value, "y", context),
    fontFamily: requireString(value, "fontFamily", context),
    fontSize: requireNumber(value, "fontSize", context),
    fontStyle: requireString(value, "fontStyle", context),
    color: requireString(value, "color", context),
    align,
    strokeColor: requireString(value, "strokeColor", context),
    strokeThickness: requireNumber(value, "strokeThickness", context),
    depth: requireNumber(value, "depth", context),
  };
}

function parseAnimation(value: unknown, context: string): ActorAnimationManifest {
  if (!isRecord(value)) {
    throw new Error(`${context} doit être un objet`);
  }

  const offset = parseOptionalOffset(value["offset"], `${context}.offset`);

  return {
    textureKey: requireString(value, "textureKey", context),
    assetPath: requireString(value, "assetPath", context),
    frameWidth: requireNumber(value, "frameWidth", context),
    frameHeight: requireNumber(value, "frameHeight", context),
    startFrame: requireNumber(value, "startFrame", context),
    endFrame: requireNumber(value, "endFrame", context),
    frameRate: requireNumber(value, "frameRate", context),
    repeat: requireNumber(value, "repeat", context),
    display: parseDisplay(value["display"], `${context}.display`),
    ...(offset === undefined ? {} : { offset }),
  };
}

export function parseActorRenderManifest(value: unknown): ActorRenderManifest {
  if (!isRecord(value)) {
    throw new Error("Le manifeste de rendu doit être un objet");
  }

  if (value["schemaVersion"] !== 1) {
    throw new Error("Version de manifeste de rendu non supportée");
  }

  if (value["kind"] !== "actor") {
    throw new Error("Le manifeste doit être de type actor");
  }

  const origin = value["origin"];
  const offset = value["offset"];
  const animations = value["animations"];
  const poses = value["poses"];
  const visualParameters = value["visualParameters"];

  if (!isRecord(origin) || !isRecord(offset) || !isRecord(animations)) {
    throw new Error("origin, offset et animations sont obligatoires");
  }

  if (!isRecord(poses) || !isRecord(poses["death"])) {
    throw new Error("poses.death est obligatoire");
  }

  if (!isRecord(visualParameters)) {
    throw new Error("visualParameters est obligatoire");
  }

  const parsedAnimations = Object.fromEntries(
    ACTOR_ANIMATION_STATES.map((state) => [
      state,
      parseAnimation(animations[state], `animations.${state}`),
    ]),
  ) as unknown as ActorRenderManifest["animations"];

  const deathPose = poses["death"];

  const deathFrameWidth = optionalNumber(deathPose, "frameWidth", "poses.death");
  const deathFrameHeight = optionalNumber(deathPose, "frameHeight", "poses.death");
  const deathStartFrame = optionalNumber(deathPose, "startFrame", "poses.death");
  const deathEndFrame = optionalNumber(deathPose, "endFrame", "poses.death");
  const deathFrameRate = optionalNumber(deathPose, "frameRate", "poses.death");
  const deathRepeat = optionalNumber(deathPose, "repeat", "poses.death");
  const deathOffset = parseOptionalOffset(deathPose["offset"], "poses.death.offset");

  return {
    schemaVersion: 1,
    id: requireString(value, "id", "manifest"),
    kind: "actor",

    origin: {
      x: requireNumber(origin, "x", "origin"),
      y: requireNumber(origin, "y", "origin"),
    },

    offset: {
      x: requireNumber(offset, "x", "offset"),
      y: requireNumber(offset, "y", "offset"),
    },

    animations: parsedAnimations,

    poses: {
      death: {
        textureKey: requireString(deathPose, "textureKey", "poses.death"),
        assetPath: requireString(deathPose, "assetPath", "poses.death"),
        display: parseDisplay(deathPose["display"], "poses.death.display"),
        ...(deathFrameWidth === undefined ? {} : { frameWidth: deathFrameWidth }),
        ...(deathFrameHeight === undefined ? {} : { frameHeight: deathFrameHeight }),
        ...(deathStartFrame === undefined ? {} : { startFrame: deathStartFrame }),
        ...(deathEndFrame === undefined ? {} : { endFrame: deathEndFrame }),
        ...(deathFrameRate === undefined ? {} : { frameRate: deathFrameRate }),
        ...(deathRepeat === undefined ? {} : { repeat: deathRepeat }),
        ...(deathOffset === undefined ? {} : { offset: deathOffset }),
      },
    },

    visualProfile: requireString(value, "visualProfile", "manifest"),

    visualParameters: {
      approachDistance: requireNumber(visualParameters, "approachDistance", "visualParameters"),
      motionDurationMs: requireNumber(visualParameters, "motionDurationMs", "visualParameters"),
      impactDelayMs: requireNumber(visualParameters, "impactDelayMs", "visualParameters"),
    },

    ambientMotion: parseAmbientMotion(value["ambientMotion"], "ambientMotion"),
  };
}
export function parseStaticActorRenderManifest(value: unknown): StaticActorRenderManifest {
  if (!isRecord(value) || value["schemaVersion"] !== 1) {
    throw new Error("Manifeste statique invalide ou non supporté");
  }

  if (value["kind"] !== "static_actor") {
    throw new Error("Le manifeste doit être de type static_actor");
  }

  const origin = value["origin"];
  const offset = value["offset"];
  const hud = value["hud"];

  if (!isRecord(origin) || !isRecord(offset) || !isRecord(hud)) {
    throw new Error("origin, offset et hud sont obligatoires");
  }

  return {
    schemaVersion: 1,
    id: requireString(value, "id", "manifest"),
    kind: "static_actor",

    textureKey: requireString(value, "textureKey", "manifest"),

    assetPath: requireString(value, "assetPath", "manifest"),

    origin: {
      x: requireNumber(origin, "x", "origin"),
      y: requireNumber(origin, "y", "origin"),
    },

    offset: {
      x: requireNumber(offset, "x", "offset"),
      y: requireNumber(offset, "y", "offset"),
    },

    display: parseDisplay(value["display"], "display"),

    hud: {
      healthBarWidth: requireNumber(hud, "healthBarWidth", "hud"),
      healthBarOffsetY: requireNumber(hud, "healthBarOffsetY", "hud"),
    },

    ambientMotion: parseAmbientMotion(value["ambientMotion"], "ambientMotion"),
  };
}

export function parseResourceNodeRenderManifest(value: unknown): ResourceNodeRenderManifest {
  if (!isRecord(value) || value["schemaVersion"] !== 1) {
    throw new Error("Manifeste de ressource invalide ou non supporté");
  }

  if (value["kind"] !== "resource_node") {
    throw new Error("Le manifeste doit être de type resource_node");
  }

  const origin = value["origin"];
  const offset = value["offset"];

  if (!isRecord(origin) || !isRecord(offset)) {
    throw new Error("origin et offset sont obligatoires");
  }

  return {
    schemaVersion: 1,
    id: requireString(value, "id", "manifest"),
    kind: "resource_node",

    textureKey: requireString(value, "textureKey", "manifest"),

    assetPath: requireString(value, "assetPath", "manifest"),

    origin: {
      x: requireNumber(origin, "x", "origin"),
      y: requireNumber(origin, "y", "origin"),
    },

    offset: {
      x: requireNumber(offset, "x", "offset"),
      y: requireNumber(offset, "y", "offset"),
    },

    display: parseDisplay(value["display"], "display"),
  };
}
export function parseFloatingTextRenderManifest(value: unknown): FloatingTextRenderManifest {
  if (!isRecord(value) || value["schemaVersion"] !== 1) {
    throw new Error("Manifeste de texte flottant invalide");
  }

  if (value["kind"] !== "floating_text") {
    throw new Error("Le manifeste doit être de type floating_text");
  }

  const textStyle = value["textStyle"];
  const motion = value["motion"];

  if (!isRecord(textStyle) || !isRecord(motion)) {
    throw new Error("textStyle et motion sont obligatoires");
  }

  return {
    schemaVersion: 1,
    id: requireString(value, "id", "manifest"),
    kind: "floating_text",

    textStyle: {
      fontFamily: requireString(textStyle, "fontFamily", "textStyle"),
      fontSize: requireNumber(textStyle, "fontSize", "textStyle"),
      fontStyle: requireString(textStyle, "fontStyle", "textStyle"),
      color: requireString(textStyle, "color", "textStyle"),
      strokeColor: requireString(textStyle, "strokeColor", "textStyle"),
      strokeThickness: requireNumber(textStyle, "strokeThickness", "textStyle"),
    },

    motion: {
      randomOffsetX: requireNumber(motion, "randomOffsetX", "motion"),
      riseDistance: requireNumber(motion, "riseDistance", "motion"),
      startScale: requireNumber(motion, "startScale", "motion"),
      endScale: requireNumber(motion, "endScale", "motion"),
      durationMs: requireNumber(motion, "durationMs", "motion"),
      ease: requireString(motion, "ease", "motion"),
    },

    depth: requireNumber(value, "depth", "manifest"),
  };
}

function requireColorPair(value: unknown, context: string): readonly [string, string] {
  if (
    !Array.isArray(value) ||
    value.length !== 2 ||
    typeof value[0] !== "string" ||
    typeof value[1] !== "string"
  ) {
    throw new Error(`${context} doit contenir deux couleurs`);
  }

  return [value[0], value[1]];
}

export function parseWorldHudRenderManifest(value: unknown): WorldHudRenderManifest {
  if (!isRecord(value) || value["schemaVersion"] !== 1) {
    throw new Error("Manifeste de HUD invalide");
  }

  const healthBar = value["healthBar"];
  const valueText = value["valueText"];
  const actorLabel = value["actorLabel"];

  if (
    value["kind"] !== "world_hud" ||
    !isRecord(healthBar) ||
    !isRecord(valueText) ||
    !isRecord(actorLabel)
  ) {
    throw new Error("Structure du manifeste world_hud invalide");
  }

  return {
    schemaVersion: 1,
    id: requireString(value, "id", "manifest"),
    kind: "world_hud",

    healthBar: {
      defaultWidth: requireNumber(healthBar, "defaultWidth", "healthBar"),
      height: requireNumber(healthBar, "height", "healthBar"),
      offsetY: requireNumber(healthBar, "offsetY", "healthBar"),
      backgroundColor: requireString(healthBar, "backgroundColor", "healthBar"),
      borderColor: requireString(healthBar, "borderColor", "healthBar"),
      borderWidth: requireNumber(healthBar, "borderWidth", "healthBar"),
      backgroundDepth: requireNumber(healthBar, "backgroundDepth", "healthBar"),
      fillDepth: requireNumber(healthBar, "fillDepth", "healthBar"),
      lowerGradient: requireColorPair(healthBar["lowerGradient"], "lowerGradient"),
      upperGradient: requireColorPair(healthBar["upperGradient"], "upperGradient"),
    },

    valueText: {
      offsetY: requireNumber(valueText, "offsetY", "valueText"),
      fontFamily: requireString(valueText, "fontFamily", "valueText"),
      fontSize: requireNumber(valueText, "fontSize", "valueText"),
      fontStyle: requireString(valueText, "fontStyle", "valueText"),
      color: requireString(valueText, "color", "valueText"),
      strokeColor: requireString(valueText, "strokeColor", "valueText"),
      strokeThickness: requireNumber(valueText, "strokeThickness", "valueText"),
      depth: requireNumber(valueText, "depth", "valueText"),
    },

    actorLabel: {
      offsetY: requireNumber(actorLabel, "offsetY", "actorLabel"),
      fontFamily: requireString(actorLabel, "fontFamily", "actorLabel"),
      fontSize: requireNumber(actorLabel, "fontSize", "actorLabel"),
      fontStyle: requireString(actorLabel, "fontStyle", "actorLabel"),
      playerColor: requireString(actorLabel, "playerColor", "actorLabel"),
      enemyColor: requireString(actorLabel, "enemyColor", "actorLabel"),
      letterSpacing: requireNumber(actorLabel, "letterSpacing", "actorLabel"),
      depth: requireNumber(actorLabel, "depth", "actorLabel"),
    },
  };
}

export function parseWorldStatusRenderManifest(value: unknown): WorldStatusRenderManifest {
  if (!isRecord(value) || value["schemaVersion"] !== 1) {
    throw new Error("Manifeste de statut du monde invalide");
  }

  if (value["kind"] !== "world_status") {
    throw new Error("Le manifeste doit être de type world_status");
  }

  return {
    schemaVersion: 1,
    id: requireString(value, "id", "manifest"),
    kind: "world_status",
    zoneText: parseWorldStatusText(value["zoneText"], "zoneText"),
    segmentText: parseWorldStatusText(value["segmentText"], "segmentText"),
    stateText: parseWorldStatusText(value["stateText"], "stateText"),
  };
}
export function parseProjectileRenderManifest(value: unknown): ProjectileRenderManifest {
  if (!isRecord(value) || value["schemaVersion"] !== 1) {
    throw new Error("Manifeste de projectile invalide ou non supporté");
  }

  if (value["kind"] !== "projectile") {
    throw new Error("Le manifeste doit être de type projectile");
  }

  const shape = value["shape"];
  const trajectory = value["trajectory"];

  if (!isRecord(shape)) {
    throw new Error("projectile.shape est obligatoire");
  }

  if (!isRecord(trajectory) || trajectory["type"] !== "linear") {
    throw new Error("projectile.trajectory linear est obligatoire");
  }

  const shapeType = requireString(shape, "type", "shape");

  const parsedShape =
    shapeType === "rectangle"
      ? {
          type: "rectangle" as const,
          width: requireNumber(shape, "width", "shape"),
          height: requireNumber(shape, "height", "shape"),
        }
      : shapeType === "circle"
        ? {
            type: "circle" as const,
            radius: requireNumber(shape, "radius", "shape"),
          }
        : undefined;

  if (parsedShape === undefined) {
    throw new Error(`Forme de projectile non supportée : ${shapeType}`);
  }

  const impact = value["impactEffect"];

  const parsedImpact = isRecord(impact)
    ? {
        shape: "circle" as const,
        radius: requireNumber(impact, "radius", "impactEffect"),
        fillColor: requireString(impact, "fillColor", "impactEffect"),
        fillAlpha: requireNumber(impact, "fillAlpha", "impactEffect"),
        strokeWidth: requireNumber(impact, "strokeWidth", "impactEffect"),
        strokeColor: requireString(impact, "strokeColor", "impactEffect"),
        depth: requireNumber(impact, "depth", "impactEffect"),
        durationMs: requireNumber(impact, "durationMs", "impactEffect"),
        endScale: requireNumber(impact, "endScale", "impactEffect"),
      }
    : undefined;

  const blendMode = requireString(value, "blendMode", "manifest");

  if (blendMode !== "normal" && blendMode !== "add") {
    throw new Error(`Mode de fusion non supporté : ${blendMode}`);
  }

  return {
    schemaVersion: 1,
    id: requireString(value, "id", "manifest"),
    kind: "projectile",

    shape: parsedShape,

    fillColor: requireString(value, "fillColor", "manifest"),

    strokeWidth: requireNumber(value, "strokeWidth", "manifest"),

    strokeColor: requireString(value, "strokeColor", "manifest"),

    blendMode,

    depth: requireNumber(value, "depth", "manifest"),

    durationMs: requireNumber(value, "durationMs", "manifest"),

    endScale: requireNumber(value, "endScale", "manifest"),

    trajectory: {
      type: "linear",

      sourceOffsetX: requireNumber(trajectory, "sourceOffsetX", "trajectory"),

      targetOffsetX: requireNumber(trajectory, "targetOffsetX", "trajectory"),

      offsetY: requireNumber(trajectory, "offsetY", "trajectory"),
    },

    ...(parsedImpact === undefined ? {} : { impactEffect: parsedImpact }),
  };
}

function parseEnvironmentPalette(value: unknown, context: string): EnvironmentPaletteManifest {
  if (!isRecord(value)) {
    throw new Error(`${context} doit être un objet`);
  }

  return {
    sky: requireString(value, "sky", context),
    ground: requireString(value, "ground", context),
    groundLine: requireString(value, "groundLine", context),
  };
}

export function parseEnvironmentRenderManifest(value: unknown): EnvironmentRenderManifest {
  if (!isRecord(value) || value["schemaVersion"] !== 1) {
    throw new Error("Manifeste d’environnement invalide ou non supporté");
  }

  if (value["kind"] !== "environment") {
    throw new Error("Le manifeste doit être de type environment");
  }

  const layout = value["layout"];
  const defaultPalette = value["defaultPalette"];
  const biomePalettes = value["biomePalettes"];
  const layers = value["layers"];

  if (!isRecord(layout) || !isRecord(defaultPalette)) {
    throw new Error("layout et defaultPalette sont obligatoires");
  }

  if (!isRecord(biomePalettes)) {
    throw new Error("biomePalettes doit être un objet");
  }

  if (!Array.isArray(layers) || layers.length === 0) {
    throw new Error("layers doit définir au moins un plan de décor");
  }

  const parsedLayers = layers.map((layer: unknown, index: number) => {
    const context = `layers.${index}`;

    if (!isRecord(layer)) {
      throw new Error(`${context} doit être un objet`);
    }

    return {
      textureKey: requireString(layer, "textureKey", context),
      assetPath: requireString(layer, "assetPath", context),
      depth: requireNumber(layer, "depth", context),
    };
  });

  const textureKeys = new Set(parsedLayers.map((layer) => layer.textureKey));
  if (textureKeys.size !== parsedLayers.length) {
    throw new Error("layers ne peut pas dupliquer une texture");
  }

  return {
    schemaVersion: 1,
    id: requireString(value, "id", "manifest"),
    kind: "environment",

    layers: parsedLayers,

    pixelArt: value["pixelArt"] === true,

    defaultPalette: parseEnvironmentPalette(defaultPalette, "defaultPalette"),

    biomePalettes: Object.fromEntries(
      Object.entries(biomePalettes).map(([key, palette]) => [
        key,
        parseEnvironmentPalette(palette, `biomePalettes.${key}`),
      ]),
    ),

    layout: {
      skyHeightRatio: requireNumber(layout, "skyHeightRatio", "layout"),

      skyYRatio: requireNumber(layout, "skyYRatio", "layout"),

      groundHeightRatio: requireNumber(layout, "groundHeightRatio", "layout"),

      groundYRatio: requireNumber(layout, "groundYRatio", "layout"),

      groundLineYRatio: requireNumber(layout, "groundLineYRatio", "layout"),

      actorShadowWidth: requireNumber(layout, "actorShadowWidth", "layout"),

      actorShadowHeight: requireNumber(layout, "actorShadowHeight", "layout"),

      actorShadowYRatio: requireNumber(layout, "actorShadowYRatio", "layout"),
    },
  };
}
export type ParsedRenderManifest =
  | ReturnType<typeof parseActorRenderManifest>
  | ReturnType<typeof parseStaticActorRenderManifest>
  | ReturnType<typeof parseResourceNodeRenderManifest>
  | ReturnType<typeof parseProjectileRenderManifest>
  | ReturnType<typeof parseFloatingTextRenderManifest>
  | ReturnType<typeof parseWorldHudRenderManifest>
  | ReturnType<typeof parseWorldStatusRenderManifest>
  | ReturnType<typeof parseEnvironmentRenderManifest>;

export function parseRenderManifest(value: unknown): ParsedRenderManifest {
  if (!isRecord(value)) {
    throw new Error("Render manifest must be an object");
  }

  switch (value["kind"]) {
    case "actor":
      return parseActorRenderManifest(value);

    case "static_actor":
      return parseStaticActorRenderManifest(value);

    case "resource_node":
      return parseResourceNodeRenderManifest(value);

    case "projectile":
      return parseProjectileRenderManifest(value);

    case "floating_text":
      return parseFloatingTextRenderManifest(value);

    case "world_hud":
      return parseWorldHudRenderManifest(value);

    case "world_status":
      return parseWorldStatusRenderManifest(value);

    case "environment":
      return parseEnvironmentRenderManifest(value);

    default:
      throw new Error(`Unsupported render manifest kind: ${String(value["kind"])}`);
  }
}

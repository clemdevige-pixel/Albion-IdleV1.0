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

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function requireString(
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

function requireNumber(
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

function parseDisplay(value: unknown, context: string): { width: number; height: number } {
  if (!isRecord(value)) throw new Error(`${context} doit être un objet`);
  const width = requireNumber(value, "width", context);
  const height = requireNumber(value, "height", context);
  if (width <= 0 || height <= 0) {
    throw new Error(`${context} doit définir des dimensions positives`);
  }
  return { width, height };
}

function parseAmbientMotion(
  value: unknown,
  context: string,
): { distance: number; durationMs: number; delayMs: number } {
  if (!isRecord(value)) throw new Error(`${context} doit être un objet`);
  return {
    distance: requireNumber(value, "distance", context),
    durationMs: requireNumber(value, "durationMs", context),
    delayMs: requireNumber(value, "delayMs", context),
  };
}

function parseWorldStatusText(
  value: unknown,
  context: string,
): WorldStatusTextManifest {
  if (!isRecord(value)) throw new Error(`${context} doit être un objet`);
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
  if (!isRecord(value)) throw new Error(`${context} doit être un objet`);
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
  };
}

export function parseActorRenderManifest(value: unknown): ActorRenderManifest {
  if (!isRecord(value)) throw new Error("Le manifeste de rendu doit être un objet");
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
        textureKey: requireString(poses["death"], "textureKey", "poses.death"),
        assetPath: requireString(poses["death"], "assetPath", "poses.death"),
        display: parseDisplay(poses["death"]["display"], "poses.death.display"),
      },
    },
    visualProfile: requireString(value, "visualProfile", "manifest"),
    visualParameters: {
      approachDistance: requireNumber(
        visualParameters,
        "approachDistance",
        "visualParameters",
      ),
      motionDurationMs: requireNumber(
        visualParameters,
        "motionDurationMs",
        "visualParameters",
      ),
      impactDelayMs: requireNumber(
        visualParameters,
        "impactDelayMs",
        "visualParameters",
      ),
    },
    ambientMotion: parseAmbientMotion(
      value["ambientMotion"],
      "ambientMotion",
    ),
  };
}

export class RenderManifestRegistry {
  readonly #actors = new Map<string, ActorRenderManifest>();
  readonly #staticActors = new Map<string, StaticActorRenderManifest>();
  readonly #projectiles = new Map<string, ProjectileRenderManifest>();
  readonly #resourceNodes = new Map<string, ResourceNodeRenderManifest>();
  readonly #environments = new Map<string, EnvironmentRenderManifest>();
  readonly #floatingTexts = new Map<string, FloatingTextRenderManifest>();
  readonly #worldHuds = new Map<string, WorldHudRenderManifest>();
  readonly #worldStatuses = new Map<string, WorldStatusRenderManifest>();
  #defaultActorId: string | undefined;
  #defaultStaticActorId: string | undefined;
  #defaultEnvironmentId: string | undefined;
  #defaultWorldHudId: string | undefined;
  #defaultWorldStatusId: string | undefined;
  readonly #defaultFloatingTextIds = new Map<"player" | "enemy", string>();

  registerActor(value: unknown): ActorRenderManifest {
    const manifest = parseActorRenderManifest(value);
    if (this.#actors.has(manifest.id)) {
      throw new Error(`Manifeste de rendu dupliqué : ${manifest.id}`);
    }
    this.#actors.set(manifest.id, manifest);
    return manifest;
  }

  getActor(id: string): ActorRenderManifest | undefined {
    return this.#actors.get(id);
  }

  requireActor(id: string): ActorRenderManifest {
    const manifest = this.getActor(id);
    if (manifest === undefined) {
      throw new Error(`Manifeste de rendu introuvable : ${id}`);
    }
    return manifest;
  }

  listActors(): readonly ActorRenderManifest[] {
    return [...this.#actors.values()];
  }

  setDefaultActor(id: string): void {
    this.requireActor(id);
    this.#defaultActorId = id;
  }

  requireDefaultActor(): ActorRenderManifest {
    if (this.#defaultActorId === undefined) {
      throw new Error("Aucun acteur de secours n'est configuré");
    }
    return this.requireActor(this.#defaultActorId);
  }

  registerStaticActor(value: unknown): StaticActorRenderManifest {
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
    const manifest: StaticActorRenderManifest = {
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
      ambientMotion: parseAmbientMotion(
        value["ambientMotion"],
        "ambientMotion",
      ),
    };
    if (this.#staticActors.has(manifest.id)) {
      throw new Error(`Manifeste statique dupliqué : ${manifest.id}`);
    }
    this.#staticActors.set(manifest.id, manifest);
    return manifest;
  }

  getStaticActor(id: string): StaticActorRenderManifest | undefined {
    return this.#staticActors.get(id);
  }

  requireStaticActor(id: string): StaticActorRenderManifest {
    const manifest = this.getStaticActor(id);
    if (manifest === undefined) {
      throw new Error(`Manifeste statique introuvable : ${id}`);
    }
    return manifest;
  }

  listStaticActors(): readonly StaticActorRenderManifest[] {
    return [...this.#staticActors.values()];
  }

  setDefaultStaticActor(id: string): void {
    this.requireStaticActor(id);
    this.#defaultStaticActorId = id;
  }

  requireDefaultStaticActor(): StaticActorRenderManifest {
    if (this.#defaultStaticActorId === undefined) {
      throw new Error("Aucun acteur statique de secours n'est configuré");
    }
    return this.requireStaticActor(this.#defaultStaticActorId);
  }

  registerResourceNode(value: unknown): ResourceNodeRenderManifest {
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
    const manifest: ResourceNodeRenderManifest = {
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
    if (this.#resourceNodes.has(manifest.id)) {
      throw new Error(`Manifeste de ressource dupliqué : ${manifest.id}`);
    }
    this.#resourceNodes.set(manifest.id, manifest);
    return manifest;
  }

  requireResourceNode(id: string): ResourceNodeRenderManifest {
    const manifest = this.#resourceNodes.get(id);
    if (manifest === undefined) {
      throw new Error(`Manifeste de ressource introuvable : ${id}`);
    }
    return manifest;
  }

  listResourceNodes(): readonly ResourceNodeRenderManifest[] {
    return [...this.#resourceNodes.values()];
  }

  registerFloatingText(value: unknown): FloatingTextRenderManifest {
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
    const manifest: FloatingTextRenderManifest = {
      schemaVersion: 1,
      id: requireString(value, "id", "manifest"),
      kind: "floating_text",
      textStyle: {
        fontFamily: requireString(textStyle, "fontFamily", "textStyle"),
        fontSize: requireNumber(textStyle, "fontSize", "textStyle"),
        fontStyle: requireString(textStyle, "fontStyle", "textStyle"),
        color: requireString(textStyle, "color", "textStyle"),
        strokeColor: requireString(textStyle, "strokeColor", "textStyle"),
        strokeThickness: requireNumber(
          textStyle,
          "strokeThickness",
          "textStyle",
        ),
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
    if (this.#floatingTexts.has(manifest.id)) {
      throw new Error(`Manifeste de texte flottant dupliqué : ${manifest.id}`);
    }
    this.#floatingTexts.set(manifest.id, manifest);
    return manifest;
  }

  requireFloatingText(id: string): FloatingTextRenderManifest {
    const manifest = this.#floatingTexts.get(id);
    if (manifest === undefined) {
      throw new Error(`Manifeste de texte flottant introuvable : ${id}`);
    }
    return manifest;
  }

  setDefaultFloatingText(
    target: "player" | "enemy",
    id: string,
  ): void {
    this.requireFloatingText(id);
    this.#defaultFloatingTextIds.set(target, id);
  }

  requireDefaultFloatingText(
    target: "player" | "enemy",
  ): FloatingTextRenderManifest {
    const id = this.#defaultFloatingTextIds.get(target);
    if (id === undefined) {
      throw new Error(`Aucun texte flottant de secours pour ${target}`);
    }
    return this.requireFloatingText(id);
  }

  registerWorldHud(value: unknown): WorldHudRenderManifest {
    if (!isRecord(value) || value["schemaVersion"] !== 1) {
      throw new Error("Manifeste de HUD invalide");
    }
    const healthBar = value["healthBar"];
    const valueText = value["valueText"];
    const actorLabel = value["actorLabel"];
    if (
      value["kind"] !== "world_hud"
      || !isRecord(healthBar)
      || !isRecord(valueText)
      || !isRecord(actorLabel)
    ) {
      throw new Error("Structure du manifeste world_hud invalide");
    }
    const lowerGradient = healthBar["lowerGradient"];
    const upperGradient = healthBar["upperGradient"];
    if (
      !Array.isArray(lowerGradient)
      || lowerGradient.length !== 2
      || !Array.isArray(upperGradient)
      || upperGradient.length !== 2
    ) {
      throw new Error("Les gradients du HUD doivent contenir deux couleurs");
    }
    const requireColorPair = (
      pair: unknown[],
      context: string,
    ): readonly [string, string] => {
      if (typeof pair[0] !== "string" || typeof pair[1] !== "string") {
        throw new Error(`${context} doit contenir deux couleurs`);
      }
      return [pair[0], pair[1]];
    };
    const manifest: WorldHudRenderManifest = {
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
        lowerGradient: requireColorPair(lowerGradient, "lowerGradient"),
        upperGradient: requireColorPair(upperGradient, "upperGradient"),
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
    if (this.#worldHuds.has(manifest.id)) {
      throw new Error(`Manifeste de HUD dupliqué : ${manifest.id}`);
    }
    this.#worldHuds.set(manifest.id, manifest);
    return manifest;
  }

  requireWorldHud(id: string): WorldHudRenderManifest {
    const manifest = this.#worldHuds.get(id);
    if (manifest === undefined) {
      throw new Error(`Manifeste de HUD introuvable : ${id}`);
    }
    return manifest;
  }

  setDefaultWorldHud(id: string): void {
    this.requireWorldHud(id);
    this.#defaultWorldHudId = id;
  }

  requireDefaultWorldHud(): WorldHudRenderManifest {
    if (this.#defaultWorldHudId === undefined) {
      throw new Error("Aucun HUD du monde de secours n'est configuré");
    }
    return this.requireWorldHud(this.#defaultWorldHudId);
  }

  registerWorldStatus(value: unknown): WorldStatusRenderManifest {
    if (!isRecord(value) || value["schemaVersion"] !== 1) {
      throw new Error("Manifeste de statut du monde invalide");
    }
    if (value["kind"] !== "world_status") {
      throw new Error("Le manifeste doit être de type world_status");
    }
    const manifest: WorldStatusRenderManifest = {
      schemaVersion: 1,
      id: requireString(value, "id", "manifest"),
      kind: "world_status",
      zoneText: parseWorldStatusText(value["zoneText"], "zoneText"),
      segmentText: parseWorldStatusText(value["segmentText"], "segmentText"),
      stateText: parseWorldStatusText(value["stateText"], "stateText"),
    };
    if (this.#worldStatuses.has(manifest.id)) {
      throw new Error(`Manifeste de statut du monde dupliqué : ${manifest.id}`);
    }
    this.#worldStatuses.set(manifest.id, manifest);
    return manifest;
  }

  requireWorldStatus(id: string): WorldStatusRenderManifest {
    const manifest = this.#worldStatuses.get(id);
    if (manifest === undefined) {
      throw new Error(`Manifeste de statut du monde introuvable : ${id}`);
    }
    return manifest;
  }

  setDefaultWorldStatus(id: string): void {
    this.requireWorldStatus(id);
    this.#defaultWorldStatusId = id;
  }

  requireDefaultWorldStatus(): WorldStatusRenderManifest {
    if (this.#defaultWorldStatusId === undefined) {
      throw new Error("Aucun statut du monde de secours n'est configuré");
    }
    return this.requireWorldStatus(this.#defaultWorldStatusId);
  }

  registerProjectile(value: unknown): ProjectileRenderManifest {
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
    const parsedShape = shapeType === "rectangle"
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

    const manifest: ProjectileRenderManifest = {
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
        sourceOffsetX: requireNumber(
          trajectory,
          "sourceOffsetX",
          "trajectory",
        ),
        targetOffsetX: requireNumber(
          trajectory,
          "targetOffsetX",
          "trajectory",
        ),
        offsetY: requireNumber(trajectory, "offsetY", "trajectory"),
      },
      ...(parsedImpact === undefined ? {} : { impactEffect: parsedImpact }),
    };

    if (this.#projectiles.has(manifest.id)) {
      throw new Error(`Manifeste de projectile dupliqué : ${manifest.id}`);
    }
    this.#projectiles.set(manifest.id, manifest);
    return manifest;
  }

  requireProjectile(id: string): ProjectileRenderManifest {
    const manifest = this.#projectiles.get(id);
    if (manifest === undefined) {
      throw new Error(`Manifeste de projectile introuvable : ${id}`);
    }
    return manifest;
  }

  registerEnvironment(value: unknown): EnvironmentRenderManifest {
    if (!isRecord(value) || value["schemaVersion"] !== 1) {
      throw new Error("Manifeste d’environnement invalide ou non supporté");
    }
    if (value["kind"] !== "environment") {
      throw new Error("Le manifeste doit être de type environment");
    }

    const layout = value["layout"];
    const defaultPalette = value["defaultPalette"];
    const biomePalettes = value["biomePalettes"];
    if (!isRecord(layout) || !isRecord(defaultPalette)) {
      throw new Error("layout et defaultPalette sont obligatoires");
    }
    if (!isRecord(biomePalettes)) {
      throw new Error("biomePalettes doit être un objet");
    }

    const parsePalette = (
      paletteValue: unknown,
      context: string,
    ): EnvironmentPaletteManifest => {
      if (!isRecord(paletteValue)) {
        throw new Error(`${context} doit être un objet`);
      }
      return {
        sky: requireString(paletteValue, "sky", context),
        ground: requireString(paletteValue, "ground", context),
        groundLine: requireString(paletteValue, "groundLine", context),
      };
    };

    const manifest: EnvironmentRenderManifest = {
      schemaVersion: 1,
      id: requireString(value, "id", "manifest"),
      kind: "environment",
      textureKey: requireString(value, "textureKey", "manifest"),
      assetPath: requireString(value, "assetPath", "manifest"),
      pixelArt: value["pixelArt"] === true,
      defaultPalette: parsePalette(defaultPalette, "defaultPalette"),
      biomePalettes: Object.fromEntries(
        Object.entries(biomePalettes).map(([key, palette]) => [
          key,
          parsePalette(palette, `biomePalettes.${key}`),
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

    if (this.#environments.has(manifest.id)) {
      throw new Error(`Manifeste d’environnement dupliqué : ${manifest.id}`);
    }
    this.#environments.set(manifest.id, manifest);
    return manifest;
  }

  requireEnvironment(id: string): EnvironmentRenderManifest {
    const manifest = this.#environments.get(id);
    if (manifest === undefined) {
      throw new Error(`Manifeste d’environnement introuvable : ${id}`);
    }
    return manifest;
  }

  listEnvironments(): readonly EnvironmentRenderManifest[] {
    return [...this.#environments.values()];
  }

  setDefaultEnvironment(id: string): void {
    this.requireEnvironment(id);
    this.#defaultEnvironmentId = id;
  }

  requireDefaultEnvironment(): EnvironmentRenderManifest {
    if (this.#defaultEnvironmentId === undefined) {
      throw new Error("Aucun environnement de secours n'est configuré");
    }
    return this.requireEnvironment(this.#defaultEnvironmentId);
  }
}

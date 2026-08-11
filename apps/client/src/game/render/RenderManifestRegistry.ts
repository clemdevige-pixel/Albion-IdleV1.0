import {
  type ActorRenderManifest,
  type EnvironmentRenderManifest,
  type FloatingTextRenderManifest,
  type ProjectileRenderManifest,
  type ResourceNodeRenderManifest,
  type StaticActorRenderManifest,
  type WorldHudRenderManifest,
  type WorldStatusRenderManifest,
} from "./RenderManifest";
import {
  parseActorRenderManifest,
  parseEnvironmentRenderManifest,
  parseFloatingTextRenderManifest,
  parseProjectileRenderManifest,
  parseWorldHudRenderManifest,
  parseWorldStatusRenderManifest,
  parseResourceNodeRenderManifest,
  parseStaticActorRenderManifest,
} from "./RenderManifestParsing";

interface RenderManifestWithId {
  readonly id: string;
}

class ManifestStore<TManifest extends RenderManifestWithId> {
  readonly #values = new Map<string, TManifest>();

  register(
    manifest: TManifest,
    duplicateError: (id: string) => Error,
  ): TManifest {
    if (this.#values.has(manifest.id)) {
      throw duplicateError(manifest.id);
    }

    this.#values.set(manifest.id, manifest);
    return manifest;
  }

  get(id: string): TManifest | undefined {
    return this.#values.get(id);
  }

  require(
    id: string,
    missingError: (id: string) => Error,
  ): TManifest {
    const manifest = this.get(id);

    if (manifest === undefined) {
      throw missingError(id);
    }

    return manifest;
  }

  list(): readonly TManifest[] {
    return [...this.#values.values()];
  }
}
export class RenderManifestRegistry {
  readonly #actors = new ManifestStore<ActorRenderManifest>();
  readonly #staticActors = new ManifestStore<StaticActorRenderManifest>();
  readonly #projectiles = new ManifestStore<ProjectileRenderManifest>();
  readonly #resourceNodes = new ManifestStore<ResourceNodeRenderManifest>();
  readonly #environments = new ManifestStore<EnvironmentRenderManifest>();
  readonly #floatingTexts = new ManifestStore<FloatingTextRenderManifest>();
  readonly #worldHuds = new ManifestStore<WorldHudRenderManifest>();
  readonly #worldStatuses = new ManifestStore<WorldStatusRenderManifest>();
  #defaultActorId: string | undefined;
  #defaultStaticActorId: string | undefined;
  #defaultEnvironmentId: string | undefined;
  #defaultWorldHudId: string | undefined;
  #defaultWorldStatusId: string | undefined;
  readonly #defaultFloatingTextIds = new Map<"player" | "enemy", string>();

  registerActor(value: unknown): ActorRenderManifest {
    const manifest = parseActorRenderManifest(value);

    return this.#actors.register(
      manifest,
      (id) => new Error(`Manifeste de rendu dupliqué : ${id}`),
    );
  }

  getActor(id: string): ActorRenderManifest | undefined {
    return this.#actors.get(id);
  }

  requireActor(id: string): ActorRenderManifest {
    return this.#actors.require(
      id,
      (missingId) =>
        new Error(`Manifeste de rendu introuvable : ${missingId}`),
    );
  }

  listActors(): readonly ActorRenderManifest[] {
    return this.#actors.list();
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
    const manifest = parseStaticActorRenderManifest(value);

    return this.#staticActors.register(
      manifest,
      (id) => new Error(`Manifeste statique dupliqué : ${id}`),
    );
  }

  getStaticActor(id: string): StaticActorRenderManifest | undefined {
    return this.#staticActors.get(id);
  }

  requireStaticActor(id: string): StaticActorRenderManifest {
    return this.#staticActors.require(
      id,
      (missingId) =>
        new Error(`Manifeste statique introuvable : ${missingId}`),
    );
  }

  listStaticActors(): readonly StaticActorRenderManifest[] {
    return this.#staticActors.list();
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
    const manifest = parseResourceNodeRenderManifest(value);

    return this.#resourceNodes.register(
      manifest,
      (id) => new Error(`Manifeste de ressource dupliqué : ${id}`),
    );
  }

  requireResourceNode(id: string): ResourceNodeRenderManifest {
    return this.#resourceNodes.require(
      id,
      (missingId) =>
        new Error(`Manifeste de ressource introuvable : ${missingId}`),
    );
  }

  listResourceNodes(): readonly ResourceNodeRenderManifest[] {
    return this.#resourceNodes.list();
  }

  registerFloatingText(value: unknown): FloatingTextRenderManifest {
    const manifest = parseFloatingTextRenderManifest(value);

    return this.#floatingTexts.register(
      manifest,
      (id) =>
        new Error(`Manifeste de texte flottant dupliqué : ${id}`),
    );
  }

  requireFloatingText(id: string): FloatingTextRenderManifest {
    return this.#floatingTexts.require(
      id,
      (missingId) =>
        new Error(
          `Manifeste de texte flottant introuvable : ${missingId}`,
        ),
    );
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
    const manifest = parseWorldHudRenderManifest(value);

    return this.#worldHuds.register(
      manifest,
      (id) => new Error(`Manifeste de HUD dupliqué : ${id}`),
    );
  }

  requireWorldHud(id: string): WorldHudRenderManifest {
    return this.#worldHuds.require(
      id,
      (missingId) =>
        new Error(`Manifeste de HUD introuvable : ${missingId}`),
    );
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
    const manifest = parseWorldStatusRenderManifest(value);

    return this.#worldStatuses.register(
      manifest,
      (id) =>
        new Error(
          `Manifeste de statut du monde dupliqué : ${id}`,
        ),
    );
  }

  requireWorldStatus(id: string): WorldStatusRenderManifest {
    return this.#worldStatuses.require(
      id,
      (missingId) =>
        new Error(
          `Manifeste de statut du monde introuvable : ${missingId}`,
        ),
    );
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
    const manifest = parseProjectileRenderManifest(value);

    return this.#projectiles.register(
      manifest,
      (id) =>
        new Error(`Manifeste de projectile dupliqué : ${id}`),
    );
  }

  requireProjectile(id: string): ProjectileRenderManifest {
    return this.#projectiles.require(
      id,
      (missingId) =>
        new Error(
          `Manifeste de projectile introuvable : ${missingId}`,
        ),
    );
  }

  registerEnvironment(value: unknown): EnvironmentRenderManifest {
    const manifest = parseEnvironmentRenderManifest(value);

    return this.#environments.register(
      manifest,
      (id) =>
        new Error(`Manifeste d’environnement dupliqué : ${id}`),
    );
  }

  requireEnvironment(id: string): EnvironmentRenderManifest {
    return this.#environments.require(
      id,
      (missingId) =>
        new Error(
          `Manifeste d’environnement introuvable : ${missingId}`,
        ),
    );
  }

  listEnvironments(): readonly EnvironmentRenderManifest[] {
    return this.#environments.list();
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

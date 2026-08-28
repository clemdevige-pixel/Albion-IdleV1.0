import type Phaser from "phaser";
import type { ActorRenderManifest } from "../RenderManifest";
import { renderManifestRegistry } from "../defaultRenderManifestRegistry";
import { ActorAnimationSystem } from "./ActorAnimationSystem";

export interface HeroPresentationState {
  readonly visualManifestId: string | undefined;
  readonly combatState: string;
  readonly zoneIndex: number;
  readonly segmentIndex: number;
}

const DUAL_DAGGER_MANIFEST_ID = "hero_dagger_pair";

/** Owns weapon-dependent hero animation selection and transitions. */
export class HeroPresentationSystem {
  private readonly animationSystem: ActorAnimationSystem;
  private currentVisualManifestId = "";
  private currentActorVisual: ActorRenderManifest | undefined;
  private weaponInitialized = false;
  private currentCombatState = "";
  private defeatPresented = false;
  private dualDaggerProbe: Phaser.GameObjects.Sprite | undefined;

  public constructor(
    private readonly sprite: Phaser.GameObjects.Sprite,
    private readonly fallbackVisualManifestId: string,
  ) {
    this.animationSystem = new ActorAnimationSystem(sprite);
  }

  public update(state: HeroPresentationState): void {
    this.currentCombatState = state.combatState;
    const nextVisualManifestId =
      state.visualManifestId ?? this.fallbackVisualManifestId;
    const defeated = state.combatState === "defeat";

    this.syncDualDaggerProbe(nextVisualManifestId);

    if (defeated) {
      this.currentVisualManifestId = nextVisualManifestId;
      this.weaponInitialized = true;
      const actorVisual = this.resolveActorVisual(nextVisualManifestId);
      const deathTexture = this.animationSystem.getDeathTexture(actorVisual);

      if (
        !this.defeatPresented
        || this.animationSystem.textureKey !== deathTexture
      ) {
        this.animationSystem.presentDeath(actorVisual);
        this.defeatPresented = true;
      }
      return;
    }

    if (this.defeatPresented) {
      this.defeatPresented = false;
      this.presentIdle();
    }

    if (!this.weaponInitialized || nextVisualManifestId !== this.currentVisualManifestId) {
      this.currentVisualManifestId = nextVisualManifestId;
      this.weaponInitialized = true;
      this.animationSystem.stop();
      this.presentIdle();
    }
  }

  public play(
    animation: "idle" | "walk" | "attack",
  ): void {
    if (this.currentCombatState === "defeat") return;
    const activeManifestId =
      this.currentVisualManifestId || this.fallbackVisualManifestId;
    const actorVisual = this.resolveActorVisual(activeManifestId);
    this.animationSystem.play(actorVisual, animation, () =>
      this.currentVisualManifestId === activeManifestId
      && this.currentCombatState !== "defeat"
    );
  }

  public clear(): void {
    this.currentActorVisual = undefined;
    this.animationSystem.clear();
    this.dualDaggerProbe?.destroy();
    this.dualDaggerProbe = undefined;
  }

  private presentIdle(): void {
    this.play("idle");
  }

  private syncDualDaggerProbe(visualManifestId: string): void {
    if (visualManifestId !== DUAL_DAGGER_MANIFEST_ID) {
      this.dualDaggerProbe?.destroy();
      this.dualDaggerProbe = undefined;
      return;
    }
    if (this.dualDaggerProbe !== undefined) return;

    const manifest = renderManifestRegistry.requireActor(DUAL_DAGGER_MANIFEST_ID);
    const idle = manifest.animations.idle;
    this.dualDaggerProbe = this.sprite.scene.add
      .sprite(
        this.sprite.scene.scale.width * 0.5,
        this.sprite.scene.scale.height * 0.5,
        idle.textureKey,
        idle.startFrame,
      )
      .setOrigin(0.5)
      .setDisplaySize(160, 240)
      .setDepth(2000)
      .setVisible(true);
  }

  private resolveActorVisual(
    visualManifestId: string | undefined,
  ): ActorRenderManifest {
    const resolvedId = visualManifestId ?? this.fallbackVisualManifestId;
    if (this.currentActorVisual?.id === resolvedId) {
      return this.currentActorVisual;
    }
    const manifest = renderManifestRegistry.requireActor(resolvedId);
    this.currentActorVisual = manifest;
    return manifest;
  }
}

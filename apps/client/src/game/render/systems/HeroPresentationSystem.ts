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
  private dualDaggerRuntimeStateLogged = false;

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

    if (nextVisualManifestId !== DUAL_DAGGER_MANIFEST_ID) {
      this.dualDaggerRuntimeStateLogged = false;
    }

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

    if (
      nextVisualManifestId === DUAL_DAGGER_MANIFEST_ID
      && !this.dualDaggerRuntimeStateLogged
    ) {
      this.logDualDaggerRuntimeState(state);
      this.dualDaggerRuntimeStateLogged = true;
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
  }

  private presentIdle(): void {
    this.play("idle");
  }

  private logDualDaggerRuntimeState(state: HeroPresentationState): void {
    const parent = this.sprite.parentContainer;
    console.info("[Render] Dual dagger runtime state", {
      requestedVisualManifestId: state.visualManifestId,
      activeVisualManifestId: this.currentVisualManifestId,
      combatState: state.combatState,
      zoneIndex: state.zoneIndex,
      segmentIndex: state.segmentIndex,
      textureKey: this.sprite.texture.key,
      frameName: this.sprite.frame.name,
      animationKey: this.sprite.anims.currentAnim?.key ?? "",
      spriteVisible: this.sprite.visible,
      spriteAlpha: this.sprite.alpha,
      spriteX: this.sprite.x,
      spriteY: this.sprite.y,
      displayWidth: this.sprite.displayWidth,
      displayHeight: this.sprite.displayHeight,
      parentVisible: parent?.visible,
      parentAlpha: parent?.alpha,
      parentX: parent?.x,
      parentY: parent?.y,
    });
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

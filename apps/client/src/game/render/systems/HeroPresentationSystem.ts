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

/** Owns weapon-dependent hero animation selection and transitions. */
export class HeroPresentationSystem {
  private readonly animationSystem: ActorAnimationSystem;
  private currentVisualManifestId = "";
  private weaponInitialized = false;
  private currentCombatState = "";
  private defeatPresented = false;
  private lastZoneIndex = -1;
  private lastSegmentIndex = -1;
  private pendingTraversal = false;

  public constructor(
    sprite: Phaser.GameObjects.Sprite,
    private readonly fallbackVisualManifestId: string,
  ) {
    this.animationSystem = new ActorAnimationSystem(sprite);
  }

  public update(state: HeroPresentationState): void {
    this.currentCombatState = state.combatState;
    const actorVisual = this.resolveActorVisual(state.visualManifestId);
    const defeated = state.combatState === "defeat";

    if (defeated) {
      this.currentVisualManifestId =
        state.visualManifestId ?? this.fallbackVisualManifestId;
      this.weaponInitialized = true;
      this.pendingTraversal = false;
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

    const nextVisualManifestId =
      state.visualManifestId ?? this.fallbackVisualManifestId;
    if (!this.weaponInitialized || nextVisualManifestId !== this.currentVisualManifestId) {
      this.currentVisualManifestId = nextVisualManifestId;
      this.weaponInitialized = true;
      this.animationSystem.stop();
      this.presentIdle();
    }

    const hasPreviousLocation =
      this.lastZoneIndex >= 0 && this.lastSegmentIndex >= 0;
    const locationChanged =
      state.zoneIndex !== this.lastZoneIndex
      || state.segmentIndex !== this.lastSegmentIndex;
    if (hasPreviousLocation && locationChanged) this.pendingTraversal = true;
    this.lastZoneIndex = state.zoneIndex;
    this.lastSegmentIndex = state.segmentIndex;

    if (state.visualManifestId !== undefined && this.pendingTraversal) {
      const attackKey = this.animationSystem.getAnimationKey(
        actorVisual,
        "attack",
      );
      if (this.animationSystem.currentAnimationKey !== attackKey) {
        this.play("walk");
        this.pendingTraversal = false;
      }
    } else if (state.visualManifestId === undefined) {
      this.pendingTraversal = false;
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
    this.animationSystem.clear();
  }

  private presentIdle(): void {
    this.play("idle");
  }

  private resolveActorVisual(
    visualManifestId: string | undefined,
  ): ActorRenderManifest {
    return renderManifestRegistry.requireActor(
      visualManifestId ?? this.fallbackVisualManifestId,
    );
  }
}

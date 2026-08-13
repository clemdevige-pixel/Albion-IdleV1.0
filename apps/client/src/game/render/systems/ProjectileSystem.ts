import Phaser from "phaser";
import type { ProjectileRenderManifest } from "../RenderManifest";
import { subscribeCombatPresentationInvalidation } from "../presentation/CombatPresentationInvalidation";
import type { VfxSystem } from "./VfxSystem";

export interface ProjectilePath {
  readonly startX: number;
  readonly endX: number;
  readonly y: number;
}

export type ProjectilePathResolver = (
  manifest: ProjectileRenderManifest,
) => ProjectilePath;

export interface ProjectilePresentation {
  readonly manifest: ProjectileRenderManifest;
  readonly onImpact: () => void;
}

/**
 * Presents projectiles and their local impact VFX.
 *
 * Hit validation and damage remain gameplay decisions. This system only
 * animates a projectile for an event that has already happened.
 */
export class ProjectileSystem {
  private readonly activeObjects = new Set<Phaser.GameObjects.GameObject>();
  private readonly activeTweens = new Set<Phaser.Tweens.Tween>();
  private readonly unsubscribeInvalidation: () => void;

  public constructor(
    private readonly scene: Phaser.Scene,
    private readonly resolvePath: ProjectilePathResolver,
    private readonly vfxSystem: VfxSystem,
  ) {
    this.unsubscribeInvalidation = subscribeCombatPresentationInvalidation(() => {
      this.clear();
    });
  }

  public present(presentation: ProjectilePresentation): void {
    const { manifest, onImpact } = presentation;
    const path = this.resolvePath(manifest);
    const fillColor = this.parseColor(manifest.fillColor);
    const strokeColor = this.parseColor(manifest.strokeColor);
    const projectile = manifest.shape.type === "rectangle"
        ? this.scene.add
            .rectangle(
              path.startX,
              path.y,
              manifest.shape.width,
              manifest.shape.height,
              fillColor,
            )
            .setStrokeStyle(
              manifest.strokeWidth,
              strokeColor,
            )
        : this.scene.add
            .circle(
              path.startX,
              path.y,
              manifest.shape.radius,
              fillColor,
            )
            .setStrokeStyle(manifest.strokeWidth, strokeColor);

    projectile.setDepth(manifest.depth);
    this.activeObjects.add(projectile);

    if (manifest.blendMode === "add") {
      projectile.setBlendMode(Phaser.BlendModes.ADD);
    }

    const flightTween = this.scene.tweens.add({
      targets: projectile,
      x: path.endX,
      scale: manifest.endScale,
      duration: manifest.durationMs,
      ease: "Linear",
      onComplete: () => {
        this.activeTweens.delete(flightTween);
        this.activeObjects.delete(projectile);
        projectile.destroy();
        onImpact();

        if (manifest.impactEffect !== undefined) {
          this.vfxSystem.presentProjectileImpact(
            path.endX,
            path.y,
            manifest.impactEffect,
          );
        }
      },
    });
    this.activeTweens.add(flightTween);
  }

  public clear(): void {
    for (const tween of this.activeTweens) {
      tween.stop();
    }
    this.activeTweens.clear();

    for (const gameObject of this.activeObjects) {
      gameObject.destroy();
    }
    this.activeObjects.clear();
  }

  public destroy(): void {
    this.unsubscribeInvalidation();
    this.clear();
  }

  private parseColor(value: string): number {
    return Phaser.Display.Color.HexStringToColor(value).color;
  }
}

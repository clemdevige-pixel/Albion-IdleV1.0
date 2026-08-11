import type Phaser from "phaser";
import type {
  WorldStatusRenderManifest,
  WorldStatusTextManifest,
} from "../RenderManifest";

export interface GatheringWorldStatus {
  readonly resourceName: string;
  readonly resourceTier: number;
  readonly progress: number;
  readonly durationSeconds: number;
}

export interface CombatWorldStatus {
  readonly combatState: string;
  readonly biomeName: string;
  readonly zoneName: string;
  readonly encounterType: string;
  readonly segmentIndex: number;
  readonly segmentCount: number;
  readonly zoneProgress: number;
}

/** Owns the status labels rendered at the top of the Phaser world. */
export class WorldStatusSystem {
  private readonly stateText: Phaser.GameObjects.Text;
  private readonly zoneText: Phaser.GameObjects.Text;
  private readonly segmentText: Phaser.GameObjects.Text;

  public constructor(
    scene: Phaser.Scene,
    width: number,
    manifest: WorldStatusRenderManifest,
  ) {
    this.zoneText = this.createText(scene, width, manifest.zoneText, "");
    this.segmentText = this.createText(scene, width, manifest.segmentText, "");
    this.stateText = this.createText(scene, width, manifest.stateText, "IDLE");
  }

  public presentGathering(status: GatheringWorldStatus): void {
    this.stateText.setText("RÉCOLTE");
    this.zoneText.setText(
      `${status.resourceName} · T${String(status.resourceTier)}`,
    );
    this.segmentText.setText(
      `${String(status.progress)}% · ${String(status.durationSeconds)} s par cycle`,
    );
  }

  public presentCombat(status: CombatWorldStatus): void {
    // Zone and segment progression now live in the permanent Header and
    // Dashboard. Keep only decisive feedback in the world so combat remains
    // readable without duplicating permanent information.
    this.zoneText.setText("");
    this.segmentText.setText("");
    this.stateText.setText(
      status.combatState === "victory"
        ? "VICTOIRE"
        : "",
    );
  }

  public clear(): void {
    this.stateText.destroy();
    this.zoneText.destroy();
    this.segmentText.destroy();
  }

  private createText(
    scene: Phaser.Scene,
    width: number,
    manifest: WorldStatusTextManifest,
    initialValue: string,
  ): Phaser.GameObjects.Text {
    return scene.add
      .text(width * manifest.xRatio, manifest.y, initialValue, {
        fontFamily: manifest.fontFamily,
        fontSize: `${String(manifest.fontSize)}px`,
        fontStyle: manifest.fontStyle,
        color: manifest.color,
        align: manifest.align,
        stroke: manifest.strokeColor,
        strokeThickness: manifest.strokeThickness,
      })
      .setOrigin(0.5)
      .setDepth(manifest.depth);
  }
}

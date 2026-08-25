import Phaser from "phaser";
import { renderManifestRegistry } from "../defaultRenderManifestRegistry";

const PROGRESS_BAR_HEIGHT = 11;

export interface GatheringPresentationState {
  readonly visualManifestId: string;
  readonly resourceName: string;
  readonly resourceTier: number;
  readonly progress: number;
}

export function preloadGatheringPresentationAssets(scene: Phaser.Scene): void {
  for (const manifest of renderManifestRegistry.listResourceNodes()) {
    scene.load.image(manifest.textureKey, manifest.assetPath);
  }
}

/** Owns the dynamic Phaser presentation used while the hero gathers. */
export class GatheringPresentationSystem {
  private readonly node: Phaser.GameObjects.Image;
  private readonly label: Phaser.GameObjects.Text;
  private readonly progressBackground: Phaser.GameObjects.Rectangle;
  private readonly progressFill: Phaser.GameObjects.Rectangle;
  private gatheringTween: Phaser.Tweens.Tween | undefined;
  private active = false;
  private readonly nodeBaseX: number;
  private readonly nodeBaseY: number;
  private lastVisualManifestId: string | undefined;
  private lastResourceLabel: string | undefined;
  private lastProgress: number | undefined;

  public constructor(
    private readonly scene: Phaser.Scene,
    private readonly playerBody: Phaser.GameObjects.Container,
    private readonly playerHomeX: number,
    x: number,
    y: number,
    private readonly progressBarWidth: number,
  ) {
    this.nodeBaseX = x;
    this.nodeBaseY = y;
    const fallback = renderManifestRegistry.requireResourceNode("resource_wood");
    this.node = scene.add
      .image(x + fallback.offset.x, y + fallback.offset.y, fallback.textureKey)
      .setOrigin(fallback.origin.x, fallback.origin.y)
      .setDisplaySize(fallback.display.width, fallback.display.height)
      .setDepth(8)
      .setVisible(false);

    this.progressBackground = scene.add
      .rectangle(
        x,
        y - 132,
        progressBarWidth,
        PROGRESS_BAR_HEIGHT,
        0x171c28,
      )
      .setStrokeStyle(2, 0x30384a)
      .setDepth(10)
      .setVisible(false);

    this.progressFill = scene.add
      .rectangle(
        x - progressBarWidth / 2,
        y - 132,
        0,
        PROGRESS_BAR_HEIGHT,
        0x78a95f,
      )
      .setOrigin(0, 0.5)
      .setDepth(11)
      .setVisible(false);

    this.label = scene.add
      .text(x, y + 78, "RESSOURCE", {
        fontFamily: "system-ui, sans-serif",
        fontSize: "13px",
        fontStyle: "bold",
        color: "#9dcc8e",
        letterSpacing: 1,
      })
      .setOrigin(0.5)
      .setDepth(10)
      .setVisible(false);
  }

  public update(state: GatheringPresentationState | undefined): boolean {
    const nextActive = state !== undefined;
    if (nextActive !== this.active) this.setActive(nextActive);
    if (state === undefined) return false;

    if (state.visualManifestId !== this.lastVisualManifestId) {
      const manifest = renderManifestRegistry.requireResourceNode(
        state.visualManifestId,
      );
      this.scene.textures
        .get(manifest.textureKey)
        .setFilter(Phaser.Textures.FilterMode.NEAREST);
      if (this.node.texture.key !== manifest.textureKey) {
        this.node.setTexture(manifest.textureKey);
      }
      this.node
        .setPosition(
          this.nodeBaseX + manifest.offset.x,
          this.nodeBaseY + manifest.offset.y,
        )
        .setOrigin(manifest.origin.x, manifest.origin.y)
        .setDisplaySize(manifest.display.width, manifest.display.height);
      this.lastVisualManifestId = state.visualManifestId;
    }

    if (state.progress !== this.lastProgress) {
      this.progressFill.width =
        this.progressBarWidth
        * Math.max(0, Math.min(1, state.progress / 100));
      this.lastProgress = state.progress;
    }

    const resourceLabel = `${state.resourceName} · T${String(state.resourceTier)}`;
    if (resourceLabel !== this.lastResourceLabel) {
      this.label.setText(resourceLabel);
      this.lastResourceLabel = resourceLabel;
    }
    return true;
  }

  public clear(): void {
    this.gatheringTween?.stop();
    this.gatheringTween = undefined;
    this.node.destroy();
    this.label.destroy();
    this.progressBackground.destroy();
    this.progressFill.destroy();
  }

  private setActive(active: boolean): void {
    this.active = active;
    this.node.setVisible(active);
    this.label.setVisible(active);
    this.progressBackground.setVisible(active);
    this.progressFill.setVisible(active);

    this.gatheringTween?.stop();
    this.gatheringTween = undefined;
    this.playerBody.setAngle(0);

    if (active) {
      this.gatheringTween = this.scene.tweens.add({
        targets: this.playerBody,
        angle: { from: -2, to: 5 },
        x: { from: this.playerHomeX, to: this.playerHomeX + 8 },
        duration: 420,
        ease: "Sine.InOut",
        yoyo: true,
        repeat: -1,
      });
    } else {
      this.playerBody.setX(this.playerHomeX);
    }
  }
}

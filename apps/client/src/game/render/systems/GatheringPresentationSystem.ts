import Phaser from "phaser";
import { renderManifestRegistry } from "../defaultRenderManifestRegistry";

const PROGRESS_BAR_HEIGHT = 11;
const PROGRESS_GAP = 18;
const LABEL_GAP = 12;

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
  private active = false;
  private readonly nodeBaseX: number;
  private readonly nodeBaseY: number;
  private lastVisualManifestId: string | undefined;
  private lastResourceLabel: string | undefined;
  private lastProgress: number | undefined;

  public constructor(
    private readonly scene: Phaser.Scene,
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
        y,
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
        y,
        0,
        PROGRESS_BAR_HEIGHT,
        0x78a95f,
      )
      .setOrigin(0, 0.5)
      .setDepth(11)
      .setVisible(false);

    this.label = scene.add
      .text(x, y, "RESSOURCE", {
        fontFamily: "system-ui, sans-serif",
        fontSize: "13px",
        fontStyle: "bold",
        color: "#9dcc8e",
        letterSpacing: 1,
      })
      .setOrigin(0.5)
      .setDepth(10)
      .setVisible(false);

    this.applyManifestLayout(fallback);
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
        .setOrigin(manifest.origin.x, manifest.origin.y)
        .setDisplaySize(manifest.display.width, manifest.display.height);
      this.applyManifestLayout(manifest);
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
  }

  private applyManifestLayout(
    manifest: ReturnType<typeof renderManifestRegistry.requireResourceNode>,
  ): void {
    const nodeX = this.nodeBaseX + manifest.offset.x;
    const nodeY = this.nodeBaseY + manifest.offset.y;
    const topY = nodeY - manifest.display.height * manifest.origin.y;
    const bottomY = nodeY + manifest.display.height * (1 - manifest.origin.y);
    const progressY = topY - PROGRESS_GAP;
    const labelY = bottomY + LABEL_GAP;

    this.node.setPosition(nodeX, nodeY);
    this.progressBackground.setPosition(nodeX, progressY);
    this.progressFill.setPosition(nodeX - this.progressBarWidth / 2, progressY);
    this.label.setPosition(nodeX, labelY);
  }
}

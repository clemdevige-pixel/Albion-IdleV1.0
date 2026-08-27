import Phaser from "phaser";
import type { WorldHudRenderManifest } from "../RenderManifest";
import { renderManifestRegistry } from "../defaultRenderManifestRegistry";

const ACTOR_HUD_HEAD_GAP = 10;
const STATUS_EFFECT_CLEARANCE = 6;

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
  private readonly progressValue: Phaser.GameObjects.Text;
  private readonly hudManifest: WorldHudRenderManifest;
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
  ) {
    this.nodeBaseX = x;
    this.nodeBaseY = y;
    this.hudManifest = renderManifestRegistry.requireDefaultWorldHud();

    const fallback = renderManifestRegistry.requireResourceNode("resource_wood");
    this.node = scene.add
      .image(x + fallback.offset.x, y + fallback.offset.y, fallback.textureKey)
      .setOrigin(fallback.origin.x, fallback.origin.y)
      .setDisplaySize(fallback.display.width, fallback.display.height)
      .setDepth(8)
      .setVisible(false);

    const { healthBar, valueText, actorLabel } = this.hudManifest;
    this.progressBackground = scene.add
      .rectangle(
        x,
        y,
        healthBar.defaultWidth,
        healthBar.height,
        this.colorToNumber(healthBar.backgroundColor),
      )
      .setStrokeStyle(
        healthBar.borderWidth,
        this.colorToNumber(healthBar.borderColor),
      )
      .setDepth(healthBar.backgroundDepth)
      .setVisible(false);

    this.progressFill = scene.add
      .rectangle(
        x - healthBar.defaultWidth / 2,
        y,
        0,
        healthBar.height,
        this.colorToNumber(healthBar.upperGradient[1]),
      )
      .setOrigin(0, 0.5)
      .setDepth(healthBar.fillDepth)
      .setVisible(false);

    this.progressValue = scene.add
      .text(x, y - valueText.offsetY, "0%", {
        fontFamily: valueText.fontFamily,
        fontSize: `${String(valueText.fontSize)}px`,
        fontStyle: valueText.fontStyle,
        color: valueText.color,
        stroke: valueText.strokeColor,
        strokeThickness: valueText.strokeThickness,
      })
      .setOrigin(0.5)
      .setDepth(valueText.depth)
      .setVisible(false);

    this.label = scene.add
      .text(x, y - actorLabel.offsetY, "RESSOURCE", {
        fontFamily: actorLabel.fontFamily,
        fontSize: `${String(actorLabel.fontSize)}px`,
        fontStyle: actorLabel.fontStyle,
        color: actorLabel.playerColor,
        letterSpacing: actorLabel.letterSpacing,
      })
      .setOrigin(0.5)
      .setDepth(actorLabel.depth)
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
      const progress = Math.max(0, Math.min(100, state.progress));
      this.progressFill.width = this.hudManifest.healthBar.defaultWidth * (progress / 100);
      this.progressValue.setText(`${String(Math.round(progress))}%`);
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
    this.progressValue.destroy();
  }

  private setActive(active: boolean): void {
    this.active = active;
    this.node.setVisible(active);
    this.label.setVisible(active);
    this.progressBackground.setVisible(active);
    this.progressFill.setVisible(active);
    this.progressValue.setVisible(active);
  }

  private applyManifestLayout(
    manifest: ReturnType<typeof renderManifestRegistry.requireResourceNode>,
  ): void {
    const nodeX = this.nodeBaseX + manifest.offset.x;
    const nodeY = this.nodeBaseY + manifest.offset.y;
    const actorTopY = nodeY - manifest.display.height * manifest.origin.y;
    const barY = actorTopY - ACTOR_HUD_HEAD_GAP - STATUS_EFFECT_CLEARANCE;
    const { healthBar, valueText, actorLabel } = this.hudManifest;

    this.node.setPosition(nodeX, nodeY);
    this.progressBackground
      .setPosition(nodeX, barY)
      .setSize(healthBar.defaultWidth, healthBar.height);
    this.progressFill.setPosition(nodeX - healthBar.defaultWidth / 2, barY);
    this.progressValue.setPosition(nodeX, barY - valueText.offsetY);
    this.label.setPosition(nodeX, barY - actorLabel.offsetY);
  }

  private colorToNumber(color: string): number {
    return Phaser.Display.Color.HexStringToColor(color).color;
  }
}

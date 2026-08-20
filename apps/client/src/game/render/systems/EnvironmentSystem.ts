import Phaser from "phaser";
import type {
  EnvironmentPaletteManifest,
  EnvironmentRenderManifest,
} from "../RenderManifest";

export function preloadEnvironmentManifest(
  scene: Phaser.Scene,
  manifest: EnvironmentRenderManifest,
): void {
  scene.load.image(manifest.textureKey, manifest.assetPath);
}

/** Owns world background layers and biome atmosphere. */
export class EnvironmentSystem {
  private readonly objects: Phaser.GameObjects.GameObject[] = [];
  private background!: Phaser.GameObjects.TileSprite;
  private groundDetail!: Phaser.GameObjects.Graphics;
  private skyTint!: Phaser.GameObjects.Rectangle;
  private groundTint!: Phaser.GameObjects.Rectangle;
  private groundLine!: Phaser.GameObjects.Rectangle;
  private playerShadow!: Phaser.GameObjects.Ellipse;
  private enemyShadow!: Phaser.GameObjects.Ellipse;
  private currentBiomeTheme = "";
  private currentManifestId = "";
  private groundDetailColor = 0;
  private travelOffset = 0;
  private traversalTween: Phaser.Tweens.Tween | undefined;
  private manifest!: EnvironmentRenderManifest;

  public constructor(private readonly scene: Phaser.Scene) {}

  public create(
    manifest: EnvironmentRenderManifest,
    width: number,
    height: number,
  ): void {
    this.manifest = manifest;
    const texture = this.scene.textures.get(manifest.textureKey);
    if (manifest.pixelArt) {
      texture.setFilter(Phaser.Textures.FilterMode.NEAREST);
    }

    this.background = this.scene.add
      .tileSprite(width / 2, height / 2, width, height, manifest.textureKey)
      .setOrigin(0.5)
      .setDepth(-20);
    this.fitBackground(width, height);

    const defaultColors = this.parsePalette(manifest.defaultPalette);
    const { layout } = manifest;
    this.skyTint = this.scene.add
      .rectangle(
        width / 2,
        height * layout.skyYRatio,
        width,
        height * layout.skyHeightRatio,
        defaultColors.sky,
        0.08,
      )
      .setDepth(-19);
    this.groundTint = this.scene.add
      .rectangle(
        width / 2,
        height * layout.groundYRatio,
        width,
        height * layout.groundHeightRatio,
        defaultColors.ground,
        0.08,
      )
      .setDepth(-18);
    this.groundLine = this.scene.add
      .rectangle(
        width / 2,
        height * layout.groundLineYRatio,
        width,
        2,
        defaultColors.groundLine,
        0.35,
      )
      .setDepth(-5);
    this.groundDetail = this.scene.add.graphics().setDepth(-4);
    this.groundDetailColor = defaultColors.groundLine;
    this.drawGroundDetails(width, height);
    this.playerShadow = this.scene.add
      .ellipse(
        width * 0.32,
        height * layout.actorShadowYRatio,
        layout.actorShadowWidth,
        layout.actorShadowHeight,
        0x000000,
        0.32,
      )
      .setDepth(1);
    this.enemyShadow = this.scene.add
      .ellipse(
        width * 0.68,
        height * layout.actorShadowYRatio,
        layout.actorShadowWidth,
        layout.actorShadowHeight,
        0x000000,
        0.32,
      )
      .setDepth(1);

    this.objects.push(
      this.background,
      this.skyTint,
      this.groundTint,
      this.groundLine,
      this.groundDetail,
      this.playerShadow,
      this.enemyShadow,
    );
    this.currentManifestId = manifest.id;
  }

  public setEnvironment(
    manifest: EnvironmentRenderManifest,
    biomeTheme: string,
    width: number,
    height: number,
  ): void {
    if (manifest.id !== this.currentManifestId) {
      this.stopTraversal();
      this.travelOffset = 0;
      this.manifest = manifest;
      const texture = this.scene.textures.get(manifest.textureKey);
      texture.setFilter(
        manifest.pixelArt
          ? Phaser.Textures.FilterMode.NEAREST
          : Phaser.Textures.FilterMode.LINEAR,
      );
      this.background
        .setTexture(manifest.textureKey)
        .setPosition(width / 2, height / 2)
        .setSize(width, height);
      this.fitBackground(width, height);
      const { layout } = manifest;
      this.skyTint
        .setPosition(width / 2, height * layout.skyYRatio)
        .setSize(width, height * layout.skyHeightRatio);
      this.groundTint
        .setPosition(width / 2, height * layout.groundYRatio)
        .setSize(width, height * layout.groundHeightRatio);
      this.groundLine
        .setPosition(width / 2, height * layout.groundLineYRatio)
        .setSize(width, 2);
      this.playerShadow
        .setPosition(width * 0.32, height * layout.actorShadowYRatio)
        .setSize(layout.actorShadowWidth, layout.actorShadowHeight);
      this.enemyShadow
        .setPosition(width * 0.68, height * layout.actorShadowYRatio)
        .setSize(layout.actorShadowWidth, layout.actorShadowHeight);
      this.currentManifestId = manifest.id;
      this.currentBiomeTheme = "";
    }

    this.setBiomeTheme(biomeTheme);
  }

  public presentTraversal(): void {
    this.stopTraversal();

    const origin = this.travelOffset;
    const { distance, durationMs } = this.manifest.traversal;
    this.traversalTween = this.scene.tweens.addCounter({
      from: 0,
      to: distance,
      duration: durationMs,
      ease: "Sine.InOut",
      onUpdate: (tween: Phaser.Tweens.Tween) => {
        const value = tween.getValue();
        if (value === null) return;

        this.travelOffset = origin + value;
        this.updateTraversalLayers();
      },
      onComplete: () => {
        this.travelOffset = origin + distance;
        this.updateTraversalLayers();
        this.traversalTween = undefined;
      },
    });
  }

  public setBiomeTheme(biomeTheme: string): void {
    if (biomeTheme === this.currentBiomeTheme) return;

    this.currentBiomeTheme = biomeTheme;
    const palette =
      this.manifest.biomePalettes[biomeTheme]
      ?? this.manifest.defaultPalette;
    const colors = this.parsePalette(palette);
    this.skyTint.setFillStyle(colors.sky, 0.08);
    this.groundTint.setFillStyle(colors.ground, 0.08);
    this.groundLine.setFillStyle(colors.groundLine, 0.35);
    this.groundDetailColor = colors.groundLine;
    this.drawGroundDetails(this.scene.scale.width, this.scene.scale.height);
  }

  public clear(): void {
    this.stopTraversal();
    for (const gameObject of this.objects) {
      gameObject.destroy();
    }
    this.objects.length = 0;
    this.currentBiomeTheme = "";
    this.currentManifestId = "";
    this.travelOffset = 0;
  }

  private fitBackground(width: number, height: number): void {
    const frame = this.scene.textures.get(this.manifest.textureKey).get();
    const scale = Math.max(width / frame.width, height / frame.height);
    this.background.setTileScale(scale, scale);
    this.background.setTilePosition(
      this.travelOffset * this.manifest.traversal.backgroundScrollFactor,
      Math.max(0, (frame.height - height / scale) / 2),
    );
  }

  private updateTraversalLayers(): void {
    this.background.tilePositionX =
      this.travelOffset * this.manifest.traversal.backgroundScrollFactor;
    this.drawGroundDetails(this.scene.scale.width, this.scene.scale.height);
  }

  private drawGroundDetails(width: number, height: number): void {
    const { groundDetailSpacing, groundScrollFactor } = this.manifest.traversal;
    const offset = (this.travelOffset * groundScrollFactor) % groundDetailSpacing;
    const nearGroundY = height * this.manifest.layout.groundLineYRatio + 14;
    const farGroundY = nearGroundY + 16;

    this.groundDetail.clear();
    this.groundDetail.fillStyle(this.groundDetailColor, 0.36);

    for (
      let x = -groundDetailSpacing - offset;
      x <= width + groundDetailSpacing;
      x += groundDetailSpacing
    ) {
      this.groundDetail.fillEllipse(x, nearGroundY, 9, 3);
      this.groundDetail.fillEllipse(
        x + groundDetailSpacing * 0.48,
        farGroundY,
        6,
        2,
      );
    }
  }

  private stopTraversal(): void {
    this.traversalTween?.stop();
    this.traversalTween = undefined;
  }

  private parsePalette(palette: EnvironmentPaletteManifest): {
    sky: number;
    ground: number;
    groundLine: number;
  } {
    return {
      sky: Phaser.Display.Color.HexStringToColor(palette.sky).color,
      ground: Phaser.Display.Color.HexStringToColor(palette.ground).color,
      groundLine:
        Phaser.Display.Color.HexStringToColor(palette.groundLine).color,
    };
  }
}

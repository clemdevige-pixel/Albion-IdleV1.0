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
  private background!: Phaser.GameObjects.Image;
  private skyTint!: Phaser.GameObjects.Rectangle;
  private groundTint!: Phaser.GameObjects.Rectangle;
  private groundLine!: Phaser.GameObjects.Rectangle;
  private playerShadow!: Phaser.GameObjects.Ellipse;
  private enemyShadow!: Phaser.GameObjects.Ellipse;
  private currentBiomeTheme = "";
  private currentManifestId = "";
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
      .image(width / 2, height / 2, manifest.textureKey)
      .setOrigin(0.5)
      .setDepth(-20);
    this.background.setScale(
      Math.max(
        width / this.background.width,
        height / this.background.height,
      ),
    );

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
        .setScale(1);
      this.background.setScale(
        Math.max(
          width / this.background.width,
          height / this.background.height,
        ),
      );
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
  }

  public clear(): void {
    for (const gameObject of this.objects) {
      gameObject.destroy();
    }
    this.objects.length = 0;
    this.currentBiomeTheme = "";
    this.currentManifestId = "";
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

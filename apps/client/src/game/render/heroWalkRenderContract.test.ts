import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { HERO_RENDER_MANIFESTS } from "./HeroRenderCatalog";
import {
  HERO_DEATH_SOURCE_CHARACTER_HEIGHT_PX,
  HERO_TARGET_HEIGHT_PX,
  HERO_VISUAL_ARCHETYPE_BY_WEAPON_FAMILY,
} from "./HeroVisualArchetypeCatalog";
import { COMBAT_ACTOR_PRESENTATION_SCALE } from "./actorPresentationScale";

const EXPECTED_ARCHETYPE_BY_MANIFEST = {
  hero_broadsword: "plate",
  hero_longbow: "leather",
  hero_bow: "leather",
  hero_fire_staff: "cloth",
  hero_spiked_gauntlets: "plate",
  hero_dagger_pair: "leather",
} as const;

function readPngDimensions(assetPath: string): {
  readonly width: number;
  readonly height: number;
  readonly colorType: number;
} {
  const file = readFileSync(new URL(`../../../public${assetPath}`, import.meta.url));
  return {
    width: file.readUInt32BE(16),
    height: file.readUInt32BE(20),
    colorType: file.readUInt8(25),
  };
}

describe("hero walk render contract", () => {
  it("builds every hero walk animation as a continuous loop", () => {
    expect(HERO_RENDER_MANIFESTS.length).toBeGreaterThan(0);

    for (const manifest of HERO_RENDER_MANIFESTS) {
      expect(manifest.animations.walk.repeat, manifest.id).toBe(-1);
    }
  });

  it("maps every weapon family to one shared visual archetype", () => {
    expect(HERO_VISUAL_ARCHETYPE_BY_WEAPON_FAMILY).toEqual({
      sword: "plate",
      bow: "leather",
      fire_staff: "cloth",
      gloves: "plate",
      dagger: "leather",
    });

    for (const manifest of HERO_RENDER_MANIFESTS) {
      const archetype =
        EXPECTED_ARCHETYPE_BY_MANIFEST[manifest.id as keyof typeof EXPECTED_ARCHETYPE_BY_MANIFEST];
      expect(manifest.animations.walk.textureKey).toContain(`-${archetype}-walk-`);
      expect(manifest.poses.death.textureKey).toContain(`-${archetype}-death-`);
    }
  });

  it("uses only three shared weaponless walk/death pairs", () => {
    expect(
      new Set(HERO_RENDER_MANIFESTS.map((manifest) => manifest.animations.walk.textureKey)).size,
    ).toBe(3);
    expect(
      new Set(HERO_RENDER_MANIFESTS.map((manifest) => manifest.poses.death.textureKey)).size,
    ).toBe(3);
  });

  it("keeps the visible character target centralized at 130 logical pixels", () => {
    expect(HERO_TARGET_HEIGHT_PX).toBe(130);

    for (const manifest of HERO_RENDER_MANIFESTS) {
      expect(manifest.animations.walk).toMatchObject({
        frameWidth: 512,
        frameHeight: 640,
        startFrame: 0,
        endFrame: 5,
        display: { width: 160, height: 200 },
        offset: { x: 0, y: 74 },
      });
      const archetype =
        EXPECTED_ARCHETYPE_BY_MANIFEST[manifest.id as keyof typeof EXPECTED_ARCHETYPE_BY_MANIFEST];
      const deathSourceHeight = HERO_DEATH_SOURCE_CHARACTER_HEIGHT_PX[archetype];
      expect(manifest.poses.death).toMatchObject({
        frameWidth: 512,
        frameHeight: 640,
        startFrame: 0,
        endFrame: 5,
      });
      expect(
        (manifest.poses.death.display.height *
          COMBAT_ACTOR_PRESENTATION_SCALE *
          deathSourceHeight) /
          640,
      ).toBeCloseTo(HERO_TARGET_HEIGHT_PX);
      expect(manifest.poses.death.display.height).toBeGreaterThan(
        manifest.animations.walk.display.height,
      );
    }
  });

  it("ships every shared sheet as six transparent 512x640 frames", () => {
    const assetPaths = new Set(
      HERO_RENDER_MANIFESTS.flatMap((manifest) => [
        manifest.animations.walk.assetPath,
        manifest.poses.death.assetPath,
      ]),
    );

    expect(assetPaths.size).toBe(6);
    for (const assetPath of assetPaths) {
      const dimensions = readPngDimensions(assetPath);
      expect(dimensions, assetPath).toMatchObject({
        width: 3072,
        height: 640,
      });
      expect([3, 6], `${assetPath} must preserve transparency`).toContain(dimensions.colorType);
    }
  });
});

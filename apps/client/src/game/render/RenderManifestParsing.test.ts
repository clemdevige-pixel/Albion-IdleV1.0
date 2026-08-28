import { describe, expect, it } from "vitest";
import monsterManifest from "./manifests/monster-stonefang-wolf.render.json";
import environmentManifest from "./manifests/environment-birch-forest.render.json";
import projectileManifest from "./manifests/projectile-arrow.render.json";
import { requireHeroRenderManifest } from "./HeroRenderCatalog";
import { parseRenderManifest } from "./RenderManifestParsing";

const heroManifest = requireHeroRenderManifest("hero_broadsword");
const fireStaffManifest = requireHeroRenderManifest("hero_infernal");
const longbowManifest = requireHeroRenderManifest("hero_longbow");
const spikedGauntletsManifest = requireHeroRenderManifest("hero_spiked_gauntlets");
const daggerPairManifest = requireHeroRenderManifest("hero_dagger_pair");

describe("parseRenderManifest", () => {
  it("dispatches manifests according to their kind", () => {
    expect(parseRenderManifest(heroManifest).kind).toBe("actor");
    expect(parseRenderManifest(monsterManifest).kind).toBe("static_actor");
    expect(parseRenderManifest(projectileManifest).kind).toBe("projectile");
    expect(parseRenderManifest(environmentManifest).kind).toBe("environment");
  });

  it("rejects an unsupported manifest kind", () => {
    expect(() =>
      parseRenderManifest({
        schemaVersion: 1,
        kind: "unknown_kind",
      }),
    ).toThrow("Unsupported render manifest kind");
  });
});

describe("Hero state-specific presentation parsing", () => {
  const cases = [
    {
      label: "broadsword",
      manifest: heroManifest,
      offset: { x: 0, y: 58 },
    },
    {
      label: "fire staff",
      manifest: fireStaffManifest,
      offset: { x: 0, y: 58 },
    },
    {
      label: "longbow",
      manifest: longbowManifest,
      offset: { x: 0, y: 58 },
    },
    {
      label: "spiked gauntlets",
      manifest: spikedGauntletsManifest,
      offset: { x: 0, y: 58 },
    },
    {
      label: "dagger pair",
      manifest: daggerPairManifest,
      offset: { x: 0, y: 58 },
    },
  ] as const;

  for (const testCase of cases) {
    it(`keeps ${testCase.label} combat framing and parses shared states`, () => {
      const parsed = parseRenderManifest(testCase.manifest);

      if (parsed.kind !== "actor") {
        throw new Error("Expected actor manifest");
      }

      expect(parsed.offset).toEqual(testCase.offset);
      for (const state of ["idle", "walk", "attack"] as const) {
        const expectedAnimation = testCase.manifest.animations[state];
        expect(parsed.animations[state]).toMatchObject({
          frameWidth: expectedAnimation.frameWidth,
          frameHeight: expectedAnimation.frameHeight,
          startFrame: expectedAnimation.startFrame,
          endFrame: expectedAnimation.endFrame,
          display: expectedAnimation.display,
          ...(expectedAnimation.offset === undefined ? {} : { offset: expectedAnimation.offset }),
        });
        if (expectedAnimation.offset === undefined) {
          expect(parsed.animations[state].offset).toBeUndefined();
        }
      }

      const expectedDeath = testCase.manifest.poses.death;
      expect(parsed.poses.death).toMatchObject({
        frameWidth: expectedDeath.frameWidth,
        frameHeight: expectedDeath.frameHeight,
        startFrame: expectedDeath.startFrame,
        endFrame: expectedDeath.endFrame,
        frameRate: expectedDeath.frameRate,
        repeat: expectedDeath.repeat,
        display: expectedDeath.display,
        ...(expectedDeath.offset === undefined ? {} : { offset: expectedDeath.offset }),
      });
      if (expectedDeath.offset === undefined) {
        expect(parsed.poses.death.offset).toBeUndefined();
      }
    });
  }
});

describe("Static actor manifest parsing", () => {
  it("preserves authored static actor presentation metadata", () => {
    const parsed = parseRenderManifest(monsterManifest);

    if (parsed.kind !== "static_actor") {
      throw new Error("Expected static actor manifest");
    }

    expect(parsed.display.width).toBeGreaterThan(0);
    expect(parsed.display.height).toBeGreaterThan(0);
    expect(parsed.hud.healthBarWidth).toBeGreaterThan(0);
    expect(parsed.hud.healthBarOffsetY).toBeGreaterThan(0);
  });
});

describe("Static environment manifest parsing", () => {
  it("preserves the authored layer order", () => {
    const parsed = parseRenderManifest(environmentManifest);

    if (parsed.kind !== "environment") {
      throw new Error("Expected environment manifest");
    }

    expect(parsed.layers.map((layer) => layer.depth)).toEqual([-30, -20, -10]);
  });

  it("anchors actor shadows to the authored combat ground line", () => {
    const parsed = parseRenderManifest(environmentManifest);

    if (parsed.kind !== "environment") {
      throw new Error("Expected environment manifest");
    }

    expect(parsed.layout.groundLineYRatio).toBe(0.82);
    expect(parsed.layout.actorShadowYRatio).toBe(parsed.layout.groundLineYRatio);
  });

  it("rejects an environment without background layers", () => {
    expect(() =>
      parseRenderManifest({
        ...environmentManifest,
        layers: [],
      }),
    ).toThrow("layers doit définir au moins un plan de décor");
  });
});

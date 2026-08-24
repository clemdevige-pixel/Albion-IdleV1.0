import { describe, expect, it } from "vitest";
import monsterManifest from "./manifests/monster-stonefang-wolf.render.json";
import environmentManifest from "./manifests/environment-birch-forest.render.json";
import projectileManifest from "./manifests/projectile-arrow.render.json";
import { requireHeroRenderManifest } from "./HeroRenderCatalog";
import { parseRenderManifest } from "./RenderManifestParsing";

const heroManifest = requireHeroRenderManifest("hero_broadsword");
const fireStaffManifest = requireHeroRenderManifest("hero_fire_staff");
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

describe("Dagger Pair death pose parsing", () => {
  it("preserves animated death metadata from the manifest", () => {
    const parsed = parseRenderManifest(daggerPairManifest);

    if (parsed.kind !== "actor") {
      throw new Error("Expected actor manifest");
    }

    expect(parsed.poses.death.frameWidth).toBe(512);
    expect(parsed.poses.death.frameHeight).toBe(512);
    expect(parsed.poses.death.startFrame).toBe(0);
    expect(parsed.poses.death.endFrame).toBe(5);
    expect(parsed.poses.death.frameRate).toBe(8);
    expect(parsed.poses.death.repeat).toBe(0);
  });
});

describe("Broadsword normalized animation parsing", () => {
  it("uses the canonical frame and display reference for every animation", () => {
    const parsed = parseRenderManifest(heroManifest);

    if (parsed.kind !== "actor") {
      throw new Error("Expected actor manifest");
    }

    expect(parsed.offset).toEqual({ x: -5, y: 58 });

    for (const animation of Object.values(parsed.animations)) {
      expect(animation.frameWidth).toBe(512);
      expect(animation.frameHeight).toBe(512);
      expect(animation.startFrame).toBe(0);
      expect(animation.endFrame).toBe(5);
      expect(animation.display).toEqual({
        width: 228.5714285714,
        height: 228.5714285714,
      });
    }

    expect(parsed.poses.death).toMatchObject({
      frameWidth: 512,
      frameHeight: 512,
      startFrame: 0,
      endFrame: 5,
      frameRate: 8,
      repeat: 0,
    });
  });
});

describe("Fire Staff normalized animation parsing", () => {
  it("uses the canonical frame and display reference for every animation", () => {
    const parsed = parseRenderManifest(fireStaffManifest);

    if (parsed.kind !== "actor") {
      throw new Error("Expected actor manifest");
    }

    expect(parsed.offset).toEqual({ x: 30, y: 58 });

    for (const animation of Object.values(parsed.animations)) {
      expect(animation.frameWidth).toBe(512);
      expect(animation.frameHeight).toBe(512);
      expect(animation.startFrame).toBe(0);
      expect(animation.endFrame).toBe(5);
      expect(animation.display).toEqual({
        width: 228.5714285714,
        height: 228.5714285714,
      });
    }
  });
});

describe("Longbow normalized animation parsing", () => {
  it("uses the canonical frame and display reference for every animation", () => {
    const parsed = parseRenderManifest(longbowManifest);

    if (parsed.kind !== "actor") {
      throw new Error("Expected actor manifest");
    }

    expect(parsed.offset).toEqual({ x: 11, y: 58 });

    for (const animation of Object.values(parsed.animations)) {
      expect(animation.frameWidth).toBe(512);
      expect(animation.frameHeight).toBe(512);
      expect(animation.startFrame).toBe(0);
      expect(animation.endFrame).toBe(5);
      expect(animation.display).toEqual({
        width: 228.5714285714,
        height: 228.5714285714,
      });
    }
  });
});

describe("Spiked Gauntlets normalized animation parsing", () => {
  it("uses the canonical frame and display reference for every animation", () => {
    const parsed = parseRenderManifest(spikedGauntletsManifest);

    if (parsed.kind !== "actor") {
      throw new Error("Expected actor manifest");
    }

    expect(parsed.offset).toEqual({ x: 0, y: 58 });

    for (const animation of Object.values(parsed.animations)) {
      expect(animation.frameWidth).toBe(512);
      expect(animation.frameHeight).toBe(512);
      expect(animation.startFrame).toBe(0);
      expect(animation.endFrame).toBe(5);
      expect(animation.display).toEqual({
        width: 228.5714285714,
        height: 228.5714285714,
      });
    }
  });
});

describe("Dagger Pair normalized animation parsing", () => {
  it("uses the authored display reference for every animation", () => {
    const parsed = parseRenderManifest(daggerPairManifest);

    if (parsed.kind !== "actor") {
      throw new Error("Expected actor manifest");
    }

    expect(parsed.offset).toEqual({ x: 0, y: 58 });

    for (const animation of Object.values(parsed.animations)) {
      expect(animation.frameWidth).toBe(512);
      expect(animation.frameHeight).toBe(512);
      expect(animation.startFrame).toBe(0);
      expect(animation.endFrame).toBe(5);
      expect(animation.display).toEqual({ width: 182, height: 182 });
    }
  });
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

    expect(parsed.layers.map((layer) => layer.depth)).toEqual([
      -30,
      -20,
      -10,
    ]);
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

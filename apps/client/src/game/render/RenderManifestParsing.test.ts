import { describe, expect, it } from "vitest";
import heroManifest from "./manifests/hero-broadsword.render.json";
import fireStaffManifest from "./manifests/hero-fire-staff.render.json";
import longbowManifest from "./manifests/hero-longbow.render.json";
import spikedGauntletsManifest from "./manifests/hero-spiked-gauntlets.render.json";
import monsterManifest from "./manifests/monster-stonefang-wolf.render.json";
import environmentManifest from "./manifests/environment-birch-forest.render.json";
import projectileManifest from "./manifests/projectile-arrow.render.json";
import { parseRenderManifest } from "./RenderManifestParsing";

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

import daggerPairManifest from "./manifests/hero-dagger-pair.render.json";

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
  it("uses the Dual Dagger frame and display reference for every animation", () => {
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

describe("Spiked Gauntlets normalized animation parsing", () => {
  it("uses the Dual Dagger frame and display reference for every animation", () => {
    const parsed = parseRenderManifest(spikedGauntletsManifest);

    if (parsed.kind !== "actor") {
      throw new Error("Expected actor manifest");
    }

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
      display: {
        width: 228.5714285714,
        height: 228.5714285714,
      },
    });
  });
});

describe("Infernal Staff normalized animation parsing", () => {
  it("uses the Dual Dagger frame and display reference for every animation", () => {
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

describe("Longbow normalized animation parsing", () => {
  it("uses a dedicated manifest with the Dual Dagger frame and display reference", () => {
    const parsed = parseRenderManifest(longbowManifest);

    if (parsed.kind !== "actor") {
      throw new Error("Expected actor manifest");
    }

    expect(parsed.id).toBe("hero_longbow");
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

describe("Static environment manifest parsing", () => {
  it("preserves every independently configured background layer", () => {
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

    expect(parsed.layout.groundLineYRatio).toBe(0.85);
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

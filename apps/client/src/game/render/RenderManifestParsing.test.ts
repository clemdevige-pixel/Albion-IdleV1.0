import { describe, expect, it } from "vitest";
import heroManifest from "./manifests/hero-broadsword.render.json";
import monsterManifest from "./manifests/monster-stonefang-wolf.render.json";
import projectileManifest from "./manifests/projectile-arrow.render.json";
import { parseRenderManifest } from "./RenderManifestParsing";

describe("parseRenderManifest", () => {
  it("dispatches manifests according to their kind", () => {
    expect(parseRenderManifest(heroManifest).kind).toBe("actor");
    expect(parseRenderManifest(monsterManifest).kind).toBe("static_actor");
    expect(parseRenderManifest(projectileManifest).kind).toBe("projectile");
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
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

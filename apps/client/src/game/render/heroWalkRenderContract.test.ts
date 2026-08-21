import { describe, expect, it } from "vitest";
import { parseRenderManifest } from "./RenderManifestParsing";

const rawHeroManifests = import.meta.glob(
  "./manifests/hero-*.render.json",
  {
    eager: true,
    import: "default",
  },
);

describe("hero walk render contract", () => {
  it("requires every hero walk animation to loop continuously", () => {
    const entries = Object.entries(rawHeroManifests);
    expect(entries.length).toBeGreaterThan(0);

    for (const [path, rawManifest] of entries) {
      const manifest = parseRenderManifest(rawManifest);
      expect(manifest.kind, path).toBe("actor");
      if (manifest.kind !== "actor") continue;

      expect(manifest.animations.walk.repeat, path).toBe(-1);
    }
  });
});

import { describe, expect, it } from "vitest";
import { HERO_RENDER_MANIFESTS } from "./HeroRenderCatalog";

describe("hero walk render contract", () => {
  it("builds every hero walk animation as a continuous loop", () => {
    expect(HERO_RENDER_MANIFESTS.length).toBeGreaterThan(0);

    for (const manifest of HERO_RENDER_MANIFESTS) {
      expect(manifest.animations.walk.repeat, manifest.id).toBe(-1);
    }
  });
});

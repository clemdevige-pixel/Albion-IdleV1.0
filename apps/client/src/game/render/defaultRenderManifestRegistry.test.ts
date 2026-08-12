import { describe, expect, it } from "vitest";
import { renderManifestRegistry } from "./defaultRenderManifestRegistry";

describe("defaultRenderManifestRegistry", () => {
  it("automatically registers discovered render manifests", () => {
    expect(renderManifestRegistry.requireActor("hero_broadsword").id)
      .toBe("hero_broadsword");

    expect(renderManifestRegistry.requireStaticActor("monster_undead_warrior").id)
      .toBe("monster_undead_warrior");

    expect(renderManifestRegistry.requireEnvironment("birch_forest").id)
      .toBe("birch_forest");

    expect(renderManifestRegistry.requireProjectile("arrow").id)
      .toBe("arrow");
  });

  it("keeps the expected default manifests", () => {
    expect(renderManifestRegistry.requireDefaultActor().id)
      .toBe("hero_broadsword");

    expect(renderManifestRegistry.requireDefaultStaticActor().id)
      .toBe("monster_undead_warrior");

    expect(renderManifestRegistry.requireDefaultEnvironment().id)
      .toBe("birch_forest");

    expect(renderManifestRegistry.requireDefaultWorldHud().id)
      .toBe("world_hud_default");

    expect(renderManifestRegistry.requireDefaultWorldStatus().id)
      .toBe("world_status_default");
  });
});

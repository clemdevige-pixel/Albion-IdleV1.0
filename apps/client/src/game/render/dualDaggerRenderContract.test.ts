import { describe, expect, it } from "vitest";
import { resolveWeaponPresentation } from "../../data/weaponContentCatalog.js";
import { renderManifestRegistry } from "./defaultRenderManifestRegistry.js";

const DUAL_DAGGER_ITEM_IDS = [
  "item_weapon_dagger_t3_pair",
  "item_weapon_dagger_t4_pair",
  "item_weapon_dagger_t5_pair",
  "item_weapon_dagger_t6_pair",
  "item_weapon_dagger_t7_pair",
  "item_weapon_dagger_t8_pair",
] as const;

const EXPECTED_TEXTURE_KEYS = {
  idle: "hero-dagger-pair-idle",
  walk: "hero-dagger-pair-walk",
  attack: "hero-dagger-pair-attack",
  death: "hero-dagger-pair-death",
} as const;

describe("dual dagger render contract", () => {
  it("routes every dual dagger tier to the canonical actor manifest", () => {
    for (const itemId of DUAL_DAGGER_ITEM_IDS) {
      expect(resolveWeaponPresentation(itemId)?.actorManifestId).toBe("hero_dagger_pair");
    }
  });

  it("registers one canonical six-frame 512x512 sheet per actor state", () => {
    const manifest = renderManifestRegistry.requireActor("hero_dagger_pair");

    for (const state of ["idle", "walk", "attack"] as const) {
      const animation = manifest.animations[state];
      expect(animation.textureKey).toBe(EXPECTED_TEXTURE_KEYS[state]);
      expect(animation.frameWidth).toBe(512);
      expect(animation.frameHeight).toBe(512);
      expect(animation.startFrame).toBe(0);
      expect(animation.endFrame).toBe(5);
    }

    const death = manifest.poses.death;
    expect(death.textureKey).toBe(EXPECTED_TEXTURE_KEYS.death);
    expect(death.frameWidth).toBe(512);
    expect(death.frameHeight).toBe(512);
    expect(death.startFrame).toBe(0);
    expect(death.endFrame).toBe(5);
  });
});

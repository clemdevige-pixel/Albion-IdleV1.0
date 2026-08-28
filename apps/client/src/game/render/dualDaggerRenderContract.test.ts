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
  idle: "hero-dual-dagger-attack-sheet-v2",
  walk: "hero-archetype-leather-walk-sheet-v1",
  attack: "hero-dual-dagger-attack-sheet-v2",
  death: "hero-archetype-leather-death-sheet-v1",
} as const;

describe("dual dagger render contract", () => {
  it("routes every dual dagger tier to the canonical actor manifest", () => {
    for (const itemId of DUAL_DAGGER_ITEM_IDS) {
      expect(resolveWeaponPresentation(itemId)?.actorManifestId).toBe("hero_dagger_pair");
    }
  });

  it("keeps weapon combat sheets and reuses the leather movement sheets", () => {
    const manifest = renderManifestRegistry.requireActor("hero_dagger_pair");

    for (const state of ["idle", "attack"] as const) {
      const animation = manifest.animations[state];
      expect(animation.textureKey).toBe(EXPECTED_TEXTURE_KEYS[state]);
      expect(animation.frameWidth).toBe(512);
      expect(animation.frameHeight).toBe(640);
      expect(animation.startFrame).toBe(0);
    }
    expect(manifest.animations.idle.endFrame).toBe(0);
    expect(manifest.animations.attack.endFrame).toBe(5);
    expect(manifest.animations.idle.assetPath).toBe(manifest.animations.attack.assetPath);
    expect(manifest.animations.idle.display).toEqual(manifest.animations.attack.display);
    expect(manifest.animations.idle.offset).toEqual(manifest.animations.attack.offset);

    expect(manifest.animations.walk).toMatchObject({
      textureKey: EXPECTED_TEXTURE_KEYS.walk,
      frameWidth: 512,
      frameHeight: 640,
      startFrame: 0,
      endFrame: 5,
      offset: { x: 0, y: 74 },
    });

    const death = manifest.poses.death;
    expect(death.textureKey).toBe(EXPECTED_TEXTURE_KEYS.death);
    expect(death.frameWidth).toBe(512);
    expect(death.frameHeight).toBe(640);
    expect(death.startFrame).toBe(0);
    expect(death.endFrame).toBe(5);
    expect(death.offset?.x).toBe(0);
    expect(death.offset?.y).toBeGreaterThan(manifest.animations.walk.offset?.y ?? 0);
    expect(death.display.height).toBeGreaterThan(manifest.animations.walk.display.height);
  });
});

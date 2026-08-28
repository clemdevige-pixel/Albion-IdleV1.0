import { describe, expect, it } from "vitest";
import { resolveWeaponPresentation } from "../../data/weaponContentCatalog.js";
import { COMBAT_ACTOR_PRESENTATION_SCALE } from "./actorPresentationScale.js";
import { renderManifestRegistry } from "./defaultRenderManifestRegistry.js";
import { HERO_TARGET_HEIGHT_PX } from "./HeroVisualArchetypeCatalog.js";

const DUAL_DAGGER_ITEM_IDS = [
  "item_weapon_dagger_t3_pair",
  "item_weapon_dagger_t4_pair",
  "item_weapon_dagger_t5_pair",
  "item_weapon_dagger_t6_pair",
  "item_weapon_dagger_t7_pair",
  "item_weapon_dagger_t8_pair",
] as const;

const DUAL_DAGGER_COMBAT_TEXTURE_KEY = "hero-dual-dagger-attack-normalized-v2";
const DUAL_DAGGER_SOURCE_CHARACTER_HEIGHT_PX = 397;
const EXPECTED_TEXTURE_KEYS = {
  idle: DUAL_DAGGER_COMBAT_TEXTURE_KEY,
  walk: "hero-archetype-leather-walk-sheet-v1",
  attack: DUAL_DAGGER_COMBAT_TEXTURE_KEY,
  death: "hero-archetype-leather-death-sheet-v1",
} as const;

describe("dual dagger render contract", () => {
  it("routes every dual dagger tier to the canonical actor manifest", () => {
    for (const itemId of DUAL_DAGGER_ITEM_IDS) {
      expect(resolveWeaponPresentation(itemId)?.actorManifestId).toBe("hero_dagger_pair");
    }
  });

  it("reuses one normalized specialization attack sheet for idle and attack", () => {
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
    expect(manifest.animations.idle.textureKey).toBe(manifest.animations.attack.textureKey);
    expect(manifest.animations.idle.assetPath).toBe(manifest.animations.attack.assetPath);
    expect(manifest.animations.idle.display).toEqual(manifest.animations.attack.display);
    expect(manifest.animations.idle.offset).toEqual(manifest.animations.attack.offset);
    expect(
      manifest.animations.attack.display.height
        * COMBAT_ACTOR_PRESENTATION_SCALE
        * (DUAL_DAGGER_SOURCE_CHARACTER_HEIGHT_PX / manifest.animations.attack.frameHeight),
    ).toBeCloseTo(HERO_TARGET_HEIGHT_PX);

    expect(manifest.animations.walk).toMatchObject({
      textureKey: EXPECTED_TEXTURE_KEYS.walk,
      frameWidth: 512,
      frameHeight: 640,
      startFrame: 0,
      endFrame: 5,
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

import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { resolveEquipmentPresentation } from "../../data/equipmentPresentation.js";
import {
  WEAPON_ITEM_DEFINITIONS,
  resolveWeaponMastery,
} from "../../data/weaponContentCatalog.js";
import { COMBAT_ACTOR_PRESENTATION_SCALE } from "./actorPresentationScale.js";
import { renderManifestRegistry } from "./defaultRenderManifestRegistry.js";
import { HERO_TARGET_HEIGHT_PX } from "./HeroVisualArchetypeCatalog.js";

const FRAME_WIDTH = 512;
const FRAME_HEIGHT = 640;
const FRAME_COUNT = 6;

/**
 * sourceCharacterHeight is measured strictly from the top of the character's
 * head to the bottom of the feet in the normalized idle frame. Staff geometry
 * and flame effects are deliberately excluded from the 140 px render target.
 */
const CASES = [
  {
    masteryId: "mastery_infernal_staff",
    manifestId: "hero_infernal",
    textureKey: "hero-infernal-attack-normalized-v1",
    assetPath: "/assets/characters/hero-infernal-attack-normalized-v1.png",
    sourceCharacterHeight: 375,
  },
  {
    masteryId: "mastery_wildfire_staff",
    manifestId: "hero_wildfire",
    textureKey: "hero-wildfire-attack-normalized-v1",
    assetPath: "/assets/characters/hero-wildfire-attack-normalized-v1.png",
    sourceCharacterHeight: 297,
  },
  {
    masteryId: "mastery_blazing_staff",
    manifestId: "hero_blazing",
    textureKey: "hero-blazing-attack-normalized-v1",
    assetPath: "/assets/characters/hero-blazing-attack-normalized-v1.png",
    sourceCharacterHeight: 372,
  },
  {
    masteryId: "mastery_brimstone_staff",
    manifestId: "hero_brimstone",
    textureKey: "hero-brimstone-attack-normalized-v1",
    assetPath: "/assets/characters/hero-brimstone-attack-normalized-v1.png",
    sourceCharacterHeight: 378,
  },
  {
    masteryId: "mastery_great_fire_staff",
    manifestId: "hero_great_fire",
    textureKey: "hero-great-fire-attack-normalized-v1",
    assetPath: "/assets/characters/hero-great-fire-attack-normalized-v1.png",
    sourceCharacterHeight: 324,
  },
] as const;

function itemIdsForMastery(masteryId: string): readonly string[] {
  return Object.keys(WEAPON_ITEM_DEFINITIONS).filter(
    (itemId) => resolveWeaponMastery(itemId)?.weaponId === masteryId,
  );
}

describe("fire staff render contract", () => {
  for (const testCase of CASES) {
    it(`routes every ${testCase.masteryId} tier to its dedicated actor manifest`, () => {
      const itemIds = itemIdsForMastery(testCase.masteryId);
      expect(itemIds.length, testCase.masteryId).toBeGreaterThan(0);

      for (const itemId of itemIds) {
        const presentation = resolveEquipmentPresentation(itemId);
        expect(presentation?.actorManifestId, itemId).toBe(testCase.manifestId);
        expect(presentation?.combatProfileId, itemId).toBe("projectile");
        expect(presentation?.combatPresentation, itemId).toEqual({
          kind: "projectile",
          projectileId: "fireball",
          releaseDelayMs: 355,
        });
      }
    });

    it(`uses frame 0 idle and the full normalized attack sheet for ${testCase.masteryId}`, () => {
      const manifest = renderManifestRegistry.requireActor(testCase.manifestId);
      const idle = manifest.animations.idle;
      const attack = manifest.animations.attack;

      expect(idle).toMatchObject({
        textureKey: testCase.textureKey,
        assetPath: testCase.assetPath,
        frameWidth: FRAME_WIDTH,
        frameHeight: FRAME_HEIGHT,
        startFrame: 0,
        endFrame: 0,
      });
      expect(attack).toMatchObject({
        textureKey: testCase.textureKey,
        assetPath: testCase.assetPath,
        frameWidth: FRAME_WIDTH,
        frameHeight: FRAME_HEIGHT,
        startFrame: 0,
        endFrame: FRAME_COUNT - 1,
      });
      expect(idle.display).toEqual(attack.display);
      expect(idle.offset).toEqual(attack.offset);

      const renderedCharacterHeight = attack.display.height
        * COMBAT_ACTOR_PRESENTATION_SCALE
        * (testCase.sourceCharacterHeight / FRAME_HEIGHT);
      expect(renderedCharacterHeight).toBeCloseTo(HERO_TARGET_HEIGHT_PX);

      expect(manifest.animations.walk.textureKey).toBe("hero-archetype-cloth-walk-sheet-v1");
      expect(manifest.poses.death.textureKey).toBe("hero-archetype-cloth-death-sheet-v1");
      expect(manifest.ambientMotion).toEqual({ distance: 4, durationMs: 900, delayMs: 0 });
    });

    it(`keeps the committed ${testCase.masteryId} sheet at six 512x640 frames`, () => {
      const assetUrl = new URL(`../../../public${testCase.assetPath}`, import.meta.url);
      const png = readFileSync(assetUrl);
      expect(png.subarray(1, 4).toString("ascii")).toBe("PNG");
      expect(png.readUInt32BE(16)).toBe(FRAME_WIDTH * FRAME_COUNT);
      expect(png.readUInt32BE(20)).toBe(FRAME_HEIGHT);
      expect([3, 6]).toContain(png.readUInt8(25));
    });
  }
});

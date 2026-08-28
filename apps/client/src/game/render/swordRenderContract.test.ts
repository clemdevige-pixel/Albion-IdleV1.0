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

const CASES = [
  {
    masteryId: "mastery_broadsword",
    manifestId: "hero_broadsword",
    textureKey: "hero-broadsword-attack-normalized-v2",
    assetPath: "/assets/characters/hero-broadsword-attack-normalized-v2.png",
    sourceCharacterHeight: 388,
  },
  {
    masteryId: "mastery_clarent_blade",
    manifestId: "hero_clarent",
    textureKey: "hero-clarent-attack-normalized-v1",
    assetPath: "/assets/characters/hero-clarent-attack-normalized-v1.png",
    sourceCharacterHeight: 383,
  },
  {
    masteryId: "mastery_carving_sword",
    manifestId: "hero_carving",
    textureKey: "hero-carving-attack-normalized-v1",
    assetPath: "/assets/characters/hero-carving-attack-normalized-v1.png",
    sourceCharacterHeight: 382,
  },
  {
    masteryId: "mastery_galatine_pair",
    manifestId: "hero_galatine",
    textureKey: "hero-galatine-attack-normalized-v1",
    assetPath: "/assets/characters/hero-galatine-attack-normalized-v1.png",
    sourceCharacterHeight: 351,
  },
  {
    masteryId: "mastery_claymore",
    manifestId: "hero_claymore",
    textureKey: "hero-claymore-attack-normalized-v1",
    assetPath: "/assets/characters/hero-claymore-attack-normalized-v1.png",
    sourceCharacterHeight: 353,
  },
] as const;

function itemIdsForMastery(masteryId: string): readonly string[] {
  return Object.keys(WEAPON_ITEM_DEFINITIONS).filter(
    (itemId) => resolveWeaponMastery(itemId)?.weaponId === masteryId,
  );
}

describe("sword render contract", () => {
  for (const testCase of CASES) {
    it(`routes every ${testCase.masteryId} tier to its dedicated actor manifest`, () => {
      const itemIds = itemIdsForMastery(testCase.masteryId);
      expect(itemIds.length, testCase.masteryId).toBeGreaterThan(0);

      for (const itemId of itemIds) {
        expect(resolveEquipmentPresentation(itemId)?.actorManifestId, itemId).toBe(testCase.manifestId);
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
      expect(
        attack.display.height
          * COMBAT_ACTOR_PRESENTATION_SCALE
          * (testCase.sourceCharacterHeight / FRAME_HEIGHT),
      ).toBeCloseTo(HERO_TARGET_HEIGHT_PX);

      expect(manifest.animations.walk.textureKey).toBe("hero-archetype-plate-walk-sheet-v1");
      expect(manifest.poses.death.textureKey).toBe("hero-archetype-plate-death-sheet-v1");
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

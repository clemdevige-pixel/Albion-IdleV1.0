import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { FACTION_ARTIFACT_WEAPON_CONTENT } from "../../data/factionArtifactWeaponContent.js";
import { resolveEquipmentPresentation } from "../../data/equipmentPresentation.js";
import { COMBAT_ACTOR_PRESENTATION_SCALE } from "./actorPresentationScale.js";
import { renderManifestRegistry } from "./defaultRenderManifestRegistry.js";
import { HERO_TARGET_HEIGHT_PX } from "./HeroVisualArchetypeCatalog.js";

const FRAME_WIDTH = 512;
const FRAME_HEIGHT = 640;

const CASES = [
  {
    masteryId: "mastery_deathgivers",
    manifestId: "hero_deathgivers",
    textureKey: "hero-deathgiver-attack-normalized-v1",
    assetPath: "/assets/characters/hero-deathgiver-attack-normalized-v1.png",
    sourceCharacterHeight: 414,
    frameCount: 6,
    idleFrame: 5,
  },
  {
    masteryId: "mastery_claws",
    manifestId: "hero_claws",
    textureKey: "hero-claw-attack-normalized-v1",
    assetPath: "/assets/characters/hero-claw-attack-normalized-v1.png",
    sourceCharacterHeight: 525,
    frameCount: 5,
    idleFrame: 0,
  },
] as const;

describe("artifact dagger render contract", () => {
  for (const testCase of CASES) {
    it(`routes every ${testCase.masteryId} tier to its dedicated actor manifest`, () => {
      const specialization = FACTION_ARTIFACT_WEAPON_CONTENT.find(
        (entry) => entry.specializationMasteryId === testCase.masteryId,
      );
      expect(specialization).toBeDefined();

      for (const item of specialization?.items ?? []) {
        expect(resolveEquipmentPresentation(item.itemId)?.actorManifestId).toBe(testCase.manifestId);
      }
    });

    it(`uses the authored idle frame for ${testCase.masteryId}`, () => {
      const manifest = renderManifestRegistry.requireActor(testCase.manifestId);
      const idle = manifest.animations.idle;
      const attack = manifest.animations.attack;

      expect(idle).toMatchObject({
        textureKey: testCase.textureKey,
        assetPath: testCase.assetPath,
        frameWidth: FRAME_WIDTH,
        frameHeight: FRAME_HEIGHT,
        startFrame: testCase.idleFrame,
        endFrame: testCase.idleFrame,
      });
      expect(attack).toMatchObject({
        textureKey: testCase.textureKey,
        assetPath: testCase.assetPath,
        frameWidth: FRAME_WIDTH,
        frameHeight: FRAME_HEIGHT,
        startFrame: 0,
        endFrame: testCase.frameCount - 1,
      });
      expect(idle.display).toEqual(attack.display);
      expect(idle.offset).toEqual(attack.offset);
      expect(
        attack.display.height
          * COMBAT_ACTOR_PRESENTATION_SCALE
          * (testCase.sourceCharacterHeight / FRAME_HEIGHT),
      ).toBeCloseTo(HERO_TARGET_HEIGHT_PX);

      expect(manifest.animations.walk.textureKey).toBe("hero-archetype-leather-walk-sheet-v1");
      expect(manifest.poses.death.textureKey).toBe("hero-archetype-leather-death-sheet-v1");
      expect(manifest.ambientMotion).toEqual({ distance: 4, durationMs: 800, delayMs: 0 });
    });

    it(`keeps the committed ${testCase.masteryId} sheet at its authored frame count`, () => {
      const assetUrl = new URL(`../../../public${testCase.assetPath}`, import.meta.url);
      const png = readFileSync(assetUrl);
      expect(png.subarray(1, 4).toString("ascii")).toBe("PNG");
      expect(png.readUInt32BE(16)).toBe(FRAME_WIDTH * testCase.frameCount);
      expect(png.readUInt32BE(20)).toBe(FRAME_HEIGHT);
    });
  }
});

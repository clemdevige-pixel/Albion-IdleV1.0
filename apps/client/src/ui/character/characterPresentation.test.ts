import { describe, expect, it } from "vitest";
import { FACTION_ARTIFACT_WEAPON_CONTENT } from "../../data/factionArtifactWeaponContent.js";
import { renderManifestRegistry } from "../../game/render/defaultRenderManifestRegistry";
import { COMBAT_ACTOR_PRESENTATION_SCALE } from "../../game/render/actorPresentationScale";
import { HERO_TARGET_HEIGHT_PX } from "../../game/render/HeroVisualArchetypeCatalog";
import {
  CHARACTER_PREVIEW_TARGET_HEIGHT_PX,
  getEquippedHeroIdlePresentation,
  getHeroIdleBackgroundPosition,
  getHeroIdlePreviewSize,
} from "./characterPresentation";

describe("character hero idle presentation", () => {
  it("crops the canonical idle frame from a shared attack spritesheet", () => {
    const presentation = getEquippedHeroIdlePresentation("item_weapon_dagger_t4_pair");

    expect(presentation.spriteSheet).toBe(true);
    if (!presentation.spriteSheet) return;

    expect(presentation.image).toBe(
      "/assets/characters/hero-dual-dagger-attack-normalized-v2.png",
    );
    expect(presentation.frameWidth).toBe(512);
    expect(presentation.frameHeight).toBe(640);
    expect(presentation.frameCount).toBe(6);
    expect(presentation.frameIndex).toBe(0);
    expect(getHeroIdleBackgroundPosition(presentation)).toBe("0% bottom");
  });

  it("uses the same normalized display source as Phaser for preview sizing", () => {
    expect(CHARACTER_PREVIEW_TARGET_HEIGHT_PX).toBe(200);

    for (const [itemId, actorManifestId] of [
      ["item_weapon_dagger_t4_pair", "hero_dagger_pair"],
      ["item_weapon_bow_t4_longbow", "hero_longbow"],
      ["item_weapon_sword_t4_broadsword", "hero_broadsword"],
      ["item_weapon_staff_t3_infernal", "hero_infernal"],
      ["item_weapon_gloves_t4_spiked_gauntlets", "hero_spiked_gauntlets"],
    ] as const) {
      const presentation = getEquippedHeroIdlePresentation(itemId);
      expect(presentation.spriteSheet, itemId).toBe(true);
      if (!presentation.spriteSheet) continue;

      const manifest = renderManifestRegistry.getActor(actorManifestId);
      expect(manifest, actorManifestId).toBeDefined();
      if (manifest === undefined) continue;

      expect(presentation.displayWidth).toBe(manifest.animations.idle.display.width);
      expect(presentation.displayHeight).toBe(manifest.animations.idle.display.height);

      const previewSize = getHeroIdlePreviewSize(presentation);
      expect(previewSize, itemId).toBeDefined();
      if (previewSize === undefined) continue;

      const uiScale = CHARACTER_PREVIEW_TARGET_HEIGHT_PX / HERO_TARGET_HEIGHT_PX;
      expect(previewSize.width).toBeCloseTo(
        manifest.animations.idle.display.width * COMBAT_ACTOR_PRESENTATION_SCALE * uiScale,
      );
      expect(previewSize.height).toBeCloseTo(
        manifest.animations.idle.display.height * COMBAT_ACTOR_PRESENTATION_SCALE * uiScale,
      );
    }
  });

  it("uses the authored Demonfang idle frame in the character preview", () => {
    const specialization = FACTION_ARTIFACT_WEAPON_CONTENT.find(
      (entry) => entry.specializationMasteryId === "mastery_demonfang",
    );
    const itemId = specialization?.items[0]?.itemId;
    expect(itemId).toBeDefined();
    if (itemId === undefined) return;

    const presentation = getEquippedHeroIdlePresentation(itemId);
    expect(presentation.spriteSheet).toBe(true);
    if (!presentation.spriteSheet) return;

    expect(presentation.image).toBe(
      "/assets/characters/hero-demonfang-attack-normalized-v1.png",
    );
    expect(presentation.frameCount).toBe(6);
    expect(presentation.frameIndex).toBe(5);
    expect(getHeroIdleBackgroundPosition(presentation)).toBe("100% bottom");
  });

  it("uses the authored idle frame for every normalized bow preview", () => {
    const cases = [
      {
        itemId: "item_weapon_bow_t4_badon",
        image: "/assets/characters/hero-badon-attack-normalized-v1.png",
        frameIndex: 0,
      },
      {
        itemId: "item_weapon_bow_t4_longbow",
        image: "/assets/characters/hero-longbow-attack-normalized-v1.png",
        frameIndex: 0,
      },
      {
        masteryId: "mastery_wailing_bow",
        image: "/assets/characters/hero-wailing-attack-normalized-v1.png",
        frameIndex: 0,
      },
      {
        masteryId: "mastery_whispering_bow",
        image: "/assets/characters/hero-whispering-attack-normalized-v1.png",
        frameIndex: 5,
      },
      {
        masteryId: "mastery_warbow",
        image: "/assets/characters/hero-warbow-attack-normalized-v1.png",
        frameIndex: 0,
      },
    ] as const;

    for (const testCase of cases) {
      const itemId = "itemId" in testCase
        ? testCase.itemId
        : FACTION_ARTIFACT_WEAPON_CONTENT.find(
          (entry) => entry.specializationMasteryId === testCase.masteryId,
        )?.items[0]?.itemId;
      expect(itemId, "bow preview item id").toBeDefined();
      if (itemId === undefined) continue;

      const presentation = getEquippedHeroIdlePresentation(itemId);
      expect(presentation.spriteSheet).toBe(true);
      if (!presentation.spriteSheet) continue;

      expect(presentation.image).toBe(testCase.image);
      expect(presentation.frameWidth).toBe(512);
      expect(presentation.frameHeight).toBe(640);
      expect(presentation.frameCount).toBe(6);
      expect(presentation.frameIndex).toBe(testCase.frameIndex);
      expect(getHeroIdleBackgroundPosition(presentation)).toBe(
        testCase.frameIndex === 0 ? "0% bottom" : "100% bottom",
      );
    }
  });
});

import { describe, expect, it } from "vitest";
import { FACTION_ARTIFACT_WEAPON_CONTENT } from "../../data/factionArtifactWeaponContent.js";
import {
  getEquippedHeroIdlePresentation,
  getHeroIdleBackgroundPosition,
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
});

import { describe, expect, it } from "vitest";
import { getEquippedHeroIdlePresentation } from "./characterPresentation";

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
  });
});

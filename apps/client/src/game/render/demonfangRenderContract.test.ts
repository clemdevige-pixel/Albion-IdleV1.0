import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { FACTION_ARTIFACT_WEAPON_CONTENT } from "../../data/factionArtifactWeaponContent.js";
import { resolveEquipmentPresentation } from "../../data/equipmentPresentation.js";
import { COMBAT_ACTOR_PRESENTATION_SCALE } from "./actorPresentationScale.js";
import { renderManifestRegistry } from "./defaultRenderManifestRegistry.js";
import { HERO_TARGET_HEIGHT_PX } from "./HeroVisualArchetypeCatalog.js";

const FRAME_WIDTH = 512;
const FRAME_HEIGHT = 640;
const FRAME_COUNT = 6;
const SOURCE_CHARACTER_HEIGHT_PX = 398;
const TEXTURE_KEY = "hero-demonfang-attack-normalized-v1";
const ASSET_PATH = "/assets/characters/hero-demonfang-attack-normalized-v1.png";

describe("demonfang render contract", () => {
  it("routes every Demonfang tier to its dedicated actor manifest", () => {
    const specialization = FACTION_ARTIFACT_WEAPON_CONTENT.find(
      (entry) => entry.specializationMasteryId === "mastery_demonfang",
    );
    expect(specialization).toBeDefined();

    for (const item of specialization?.items ?? []) {
      expect(resolveEquipmentPresentation(item.itemId)?.actorManifestId).toBe("hero_demonfang");
    }
  });

  it("reuses the last frame as idle and the full authored sheet as attack", () => {
    const manifest = renderManifestRegistry.requireActor("hero_demonfang");
    const idle = manifest.animations.idle;
    const attack = manifest.animations.attack;

    expect(idle).toMatchObject({
      textureKey: TEXTURE_KEY,
      assetPath: ASSET_PATH,
      frameWidth: FRAME_WIDTH,
      frameHeight: FRAME_HEIGHT,
      startFrame: 5,
      endFrame: 5,
    });
    expect(attack).toMatchObject({
      textureKey: TEXTURE_KEY,
      assetPath: ASSET_PATH,
      frameWidth: FRAME_WIDTH,
      frameHeight: FRAME_HEIGHT,
      startFrame: 0,
      endFrame: 5,
    });
    expect(idle.display).toEqual(attack.display);
    expect(idle.offset).toEqual(attack.offset);
    expect(
      attack.display.height
        * COMBAT_ACTOR_PRESENTATION_SCALE
        * (SOURCE_CHARACTER_HEIGHT_PX / FRAME_HEIGHT),
    ).toBeCloseTo(HERO_TARGET_HEIGHT_PX);

    expect(manifest.animations.walk).toMatchObject({
      textureKey: "hero-archetype-leather-walk-sheet-v1",
      frameWidth: FRAME_WIDTH,
      frameHeight: FRAME_HEIGHT,
      startFrame: 0,
      endFrame: 5,
    });
    expect(manifest.poses.death.textureKey).toBe("hero-archetype-leather-death-sheet-v1");
    expect(manifest.ambientMotion).toEqual({ distance: 4, durationMs: 800, delayMs: 0 });
  });

  it("keeps the committed runtime sheet at six normalized cells", () => {
    const assetUrl = new URL(
      "../../../public/assets/characters/hero-demonfang-attack-normalized-v1.png",
      import.meta.url,
    );
    const png = readFileSync(assetUrl);
    expect(png.subarray(1, 4).toString("ascii")).toBe("PNG");
    expect(png.readUInt32BE(16)).toBe(FRAME_WIDTH * FRAME_COUNT);
    expect(png.readUInt32BE(20)).toBe(FRAME_HEIGHT);
  });
});

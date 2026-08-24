import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import {
  WEAPON_ITEM_DEFINITIONS,
  resolveWeaponArtifactFaction,
  resolveWeaponPresentation,
} from "../../data/weaponContentCatalog";
import { MONSTER_DEFINITIONS } from "../../data/monsterContentCatalog";
import { renderManifestRegistry } from "./defaultRenderManifestRegistry";

const ENGINE_FILES = [
  new URL("../GameScene.ts", import.meta.url),
  new URL("./systems/HeroPresentationSystem.ts", import.meta.url),
  new URL("./systems/CombatPresentationSystem.ts", import.meta.url),
] as const;

function readEngineSources(): readonly { readonly path: string; readonly source: string }[] {
  return ENGINE_FILES.map((url) => ({ path: fileURLToPath(url), source: readFileSync(url, "utf8") }));
}

describe("content / engine architectural boundary", () => {
  it("keeps every available weapon render route resolvable and marks asset-pending artifact weapons explicitly", () => {
    for (const itemId of Object.keys(WEAPON_ITEM_DEFINITIONS)) {
      const presentation = resolveWeaponPresentation(itemId);
      if (presentation === undefined) {
        expect(resolveWeaponArtifactFaction(itemId), `${itemId}: missing presentation must be artifact content awaiting assets`).toBeDefined();
        continue;
      }

      expect(renderManifestRegistry.getActor(presentation.actorManifestId), `${itemId}: actor manifest ${presentation.actorManifestId}`).toBeDefined();

      if (presentation.combatPresentation?.kind === "projectile") {
        expect(
          renderManifestRegistry.requireProjectile(presentation.combatPresentation.projectileId),
          `${itemId}: projectile manifest ${presentation.combatPresentation.projectileId}`,
        ).toBeDefined();
      }
    }
  });

  it("keeps every declared monster render route resolvable without engine-specific branches", () => {
    for (const monster of Object.values(MONSTER_DEFINITIONS)) {
      expect(renderManifestRegistry.getStaticActor(monster.visualManifestId), `${monster.id}: static actor manifest ${monster.visualManifestId}`).toBeDefined();
    }
  });

  it("keeps concrete content ids out of GameScene and presentation systems", () => {
    const sources = readEngineSources();
    const forbiddenIds = new Set<string>();

    for (const itemId of Object.keys(WEAPON_ITEM_DEFINITIONS)) {
      forbiddenIds.add(itemId);
      const presentation = resolveWeaponPresentation(itemId);
      if (presentation === undefined) continue;
      forbiddenIds.add(presentation.actorManifestId);
      if (presentation.combatPresentation?.kind === "projectile") forbiddenIds.add(presentation.combatPresentation.projectileId);
    }

    for (const monster of Object.values(MONSTER_DEFINITIONS)) {
      forbiddenIds.add(monster.id);
      forbiddenIds.add(monster.visualManifestId);
    }

    for (const { path, source } of sources) {
      for (const id of forbiddenIds) {
        expect(source.includes(id), `${path} must not hardcode content id "${id}"`).toBe(false);
      }
    }
  });
});

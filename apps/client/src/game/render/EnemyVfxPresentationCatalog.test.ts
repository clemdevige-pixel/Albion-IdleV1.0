import { describe, expect, it } from "vitest";
import { MONSTER_DEFINITIONS } from "../../data/monsterContentCatalog";
import {
  getAuthoredEnemyVfxManifestIds,
  resolveEnemyVfxStyle,
} from "./EnemyVfxPresentationCatalog";

describe("EnemyVfxPresentationCatalog", () => {
  it("authors one attack VFX style for every current monster visual manifest", () => {
    const monsterManifestIds = Object.values(MONSTER_DEFINITIONS)
      .map((definition) => definition.visualManifestId)
      .sort();
    const authoredManifestIds = [...getAuthoredEnemyVfxManifestIds()].sort();

    expect(authoredManifestIds).toEqual(monsterManifestIds);
    for (const visualManifestId of monsterManifestIds) {
      expect(resolveEnemyVfxStyle(visualManifestId)).toBeDefined();
    }
  });

  it("does not infer a style from an unknown manifest name", () => {
    expect(resolveEnemyVfxStyle("monster_future_unknown")).toBeUndefined();
  });
});

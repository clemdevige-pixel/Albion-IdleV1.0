import { describe, expect, it } from "vitest";
import { ENCOUNTERS_PER_SEGMENT, SEGMENTS_PER_ZONE } from "@game/data";
import { MONSTER_ABILITIES } from "./monsterAbilityContentCatalog";
import {
  MONSTER_IDS,
  getMonsterDefinition,
  resolveMonsterForEncounter,
} from "./monsterContentCatalog";
import { WORLD_ZONE_IDS } from "./worldContentCatalog";
import { renderManifestRegistry } from "../game/render/defaultRenderManifestRegistry";

describe("Undead family pilot content", () => {
  const familyIds = [
    MONSTER_IDS.undeadSkeletonSwordsman,
    MONSTER_IDS.undeadSkeletonArcher,
    MONSTER_IDS.undeadSpectralKnight,
    MONSTER_IDS.undeadLich,
  ] as const;

  it("keeps faction and family unified as Undead for all four members", () => {
    for (const id of familyIds) {
      expect(getMonsterDefinition(id).faction).toBe("Undead");
    }
  });

  it("resolves every ability and render manifest", () => {
    for (const id of familyIds) {
      const monster = getMonsterDefinition(id);
      expect(renderManifestRegistry.getStaticActor(monster.visualManifestId)).toBeDefined();
      for (const abilityId of monster.abilityIds) {
        expect(MONSTER_ABILITIES[abilityId]).toBeDefined();
      }
    }
  });

  it("uses Undead as the dominant Dark Swamp faction", () => {
    const normalA = resolveMonsterForEncounter(WORLD_ZONE_IDS.swamp, 0, 0);
    const normalB = resolveMonsterForEncounter(WORLD_ZONE_IDS.swamp, 0, 1);
    const elite = resolveMonsterForEncounter(
      WORLD_ZONE_IDS.swamp,
      0,
      ENCOUNTERS_PER_SEGMENT - 1,
    );
    const boss = resolveMonsterForEncounter(
      WORLD_ZONE_IDS.swamp,
      SEGMENTS_PER_ZONE - 1,
      ENCOUNTERS_PER_SEGMENT - 1,
    );

    expect(normalA.faction).toBe("Undead");
    expect(normalB.faction).toBe("Undead");
    expect(elite.id).toBe(MONSTER_IDS.undeadSpectralKnight);
    expect(elite.category).toBe("elite");
    expect(boss.id).toBe(MONSTER_IDS.undeadLich);
    expect(boss.category).toBe("boss");
    expect(boss.combat.damageType).toBe("magical");
  });
});

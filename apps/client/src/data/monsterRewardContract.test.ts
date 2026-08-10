import { describe, expect, it } from "vitest";
import { MONSTER_LOOT_TABLES } from "./economyContentCatalog";
import {
  MONSTER_DEFINITIONS,
  applyMonsterRewardModifiers,
  getMonsterDefinition,
} from "./monsterContentCatalog";

describe("monster reward contract", () => {
  it("keeps every monster loot-table reference resolvable", () => {
    for (const definition of Object.values(MONSTER_DEFINITIONS)) {
      expect(definition.rewards.silverMultiplier).toBeGreaterThan(0);
      expect(definition.rewards.fameMultiplier).toBeGreaterThan(0);
      expect(MONSTER_LOOT_TABLES[definition.rewards.lootTableId]).toBeDefined();
    }
  });

  it("keeps zone/segment progression rewards as the base", () => {
    const monster = getMonsterDefinition("monster_stonefang_wolf");
    expect(applyMonsterRewardModifiers({ silver: 10, fame: 15 }, monster)).toEqual({ silver: 10, fame: 15 });
    expect(applyMonsterRewardModifiers({ silver: 40, fame: 60 }, monster)).toEqual({ silver: 40, fame: 60 });
  });

  it("applies monster modifiers multiplicatively on top of progression", () => {
    const base = getMonsterDefinition("monster_stonefang_wolf");
    const boosted = {
      ...base,
      rewards: {
        ...base.rewards,
        silverMultiplier: 1.5,
        fameMultiplier: 2,
      },
    };
    expect(applyMonsterRewardModifiers({ silver: 20, fame: 30 }, boosted)).toEqual({ silver: 30, fame: 60 });
  });
});

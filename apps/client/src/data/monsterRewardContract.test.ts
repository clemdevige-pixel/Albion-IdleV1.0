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
      expect(MONSTER_LOOT_TABLES[definition.rewards.lootTableId]).toBeDefined();
    }
  });

  it("never changes canonical zone/segment rewards based on monster identity", () => {
    const rewardSamples = [
      { silver: 10, fame: 15 },
      { silver: 40, fame: 60 },
      { silver: 125, fame: 180 },
    ];

    for (const monster of Object.values(MONSTER_DEFINITIONS)) {
      for (const reward of rewardSamples) {
        expect(applyMonsterRewardModifiers(reward, monster)).toEqual(reward);
      }
    }
  });

  it("keeps different families reward-neutral at the same progression slot", () => {
    const undead = getMonsterDefinition("monster_undead_skeleton_swordsman");
    const morgana = getMonsterDefinition("monster_morgana_witch");
    const keeper = getMonsterDefinition("monster_keeper_warrior");
    const baseReward = { silver: 50, fame: 75 };

    expect(applyMonsterRewardModifiers(baseReward, undead)).toEqual(baseReward);
    expect(applyMonsterRewardModifiers(baseReward, morgana)).toEqual(baseReward);
    expect(applyMonsterRewardModifiers(baseReward, keeper)).toEqual(baseReward);
  });
});
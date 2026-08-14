import { describe, expect, it } from "vitest";
import { getCombatLootExpectations } from "./economyContentCatalog";
import {
  MONSTER_DEFINITIONS,
  applyMonsterRewardModifiers,
  getMonsterDefinition,
} from "./monsterContentCatalog";

describe("monster reward contract", () => {
  it("keeps active combat loot projection resolvable from runtime context", () => {
    const normalLoot = getCombatLootExpectations({
      segmentIndex: 0,
      faction: "Keeper",
      isElite: false,
      isBoss: false,
      isFinalBoss: false,
      enchantmentTier: 4,
      enchantmentDropWeight: 1,
    });
    const bossLoot = getCombatLootExpectations({
      segmentIndex: 9,
      faction: "Keeper",
      isElite: false,
      isBoss: true,
      isFinalBoss: true,
      enchantmentTier: 4,
      enchantmentDropWeight: 2,
    });

    expect(normalLoot.length).toBeGreaterThan(0);
    expect(normalLoot.some((drop) => drop.kind === "enchantment")).toBe(true);
    expect(normalLoot.some((drop) => drop.itemId === "item_health_potion")).toBe(false);
    expect(bossLoot.some((drop) => drop.kind === "artifact_fragment")).toBe(true);
    expect(bossLoot.some((drop) => drop.kind === "artifact")).toBe(true);
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
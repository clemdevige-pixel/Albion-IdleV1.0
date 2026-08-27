import { DUNGEON_COMPLETION_SILVER_BY_TIER, getFactionRuneItemId } from "@game/data";
import { describe, expect, it } from "vitest";
import { World, createRuntimeServices } from "@game/core";
import { DungeonRuntime, getEnchantmentShardItemId } from "@game/gameplay";
import { KEEPER_T4_DUNGEON, MORGANA_T4_DUNGEON } from "../data/dungeonContentCatalog.js";
import { createFactionMasteryFoundation } from "./bootstrap/createFactionMasteryFoundation.js";
import { createProgressionFoundation } from "./bootstrap/createProgressionFoundation.js";
import { DungeonRewardRuntime, rollInclusiveQuantity } from "./DungeonRewardRuntime.js";
import { PlayerInventoryManager } from "./PlayerInventoryManager.js";

function setup(random = () => 0, heroCapacity = 20) {
  const world = new World(createRuntimeServices());
  const heroId = world.createEntity();
  const bankId = world.createEntity();
  const inventory = new PlayerInventoryManager(world, (itemId) => ({ itemId, stackable: true, maxStack: 999 }));
  inventory.createInventory(heroId, heroCapacity);
  inventory.createInventory(bankId, 20);
  inventory.setAccessibleStorageOwners(heroId, [heroId, bankId]);
  inventory.addQuantity(heroId, KEEPER_T4_DUNGEON.keyItemId, 1);
  const dungeon = new DungeonRuntime([KEEPER_T4_DUNGEON]);
  dungeon.start(KEEPER_T4_DUNGEON.id, heroId, inventory);
  const rewards = new DungeonRewardRuntime(dungeon, inventory, heroId, random);
  return { heroId, bankId, inventory, dungeon, rewards };
}

describe("DungeonRewardRuntime", () => {
  it("rolls authored ranges inclusively", () => {
    expect(rollInclusiveQuantity({ min: 1, max: 5 }, () => 0)).toBe(1);
    expect(rollInclusiveQuantity({ min: 1, max: 5 }, () => 0.999999)).toBe(5);
    expect(rollInclusiveQuantity({ min: 0, max: 0 }, () => 0.5)).toBe(0);
  });

  it("commits encounter loot immediately so it survives a later failure", () => {
    const { heroId, inventory, dungeon, rewards } = setup(() => 0);
    const result = rewards.processCurrentEncounterVictory();
    dungeon.completeEncounter("keeper_t4_normal_1");
    dungeon.fail();

    expect(result?.drops).toEqual([
      { itemId: "item_resource_artifact_fragment_keeper", kind: "artifact_fragment", quantity: 1 },
    ]);
    expect(result?.completionSilver).toBe(0);
    expect(inventory.getTotalQuantity(heroId, "item_resource_artifact_fragment_keeper")).toBe(1);
  });

  it("uses accessible bank storage when hero inventory is full", () => {
    const { heroId, bankId, inventory, rewards } = setup(() => 0, 1);
    inventory.addQuantity(heroId, "item_health_potion", 1);
    const result = rewards.processCurrentEncounterVictory();
    expect(result?.drops).toContainEqual({ itemId: "item_resource_artifact_fragment_keeper", kind: "artifact_fragment", quantity: 1 });
    expect(inventory.getTotalQuantity(heroId, "item_resource_artifact_fragment_keeper")).toBe(0);
    expect(inventory.getTotalQuantity(bankId, "item_resource_artifact_fragment_keeper")).toBe(1);
  });

  it("keeps Silver guaranteed on completion while materials remain ranged", () => {
    const { heroId, inventory, dungeon, rewards } = setup(() => 0);
    for (const encounter of KEEPER_T4_DUNGEON.encounters.slice(0, -1)) {
      const reward = rewards.processCurrentEncounterVictory();
      expect(reward?.completionSilver).toBe(0);
      dungeon.completeEncounter(encounter.id);
    }

    const bossReward = rewards.processCurrentEncounterVictory();
    expect(bossReward?.completionSilver).toBe(DUNGEON_COMPLETION_SILVER_BY_TIER[4]);
    expect(bossReward?.drops).toContainEqual({ itemId: getEnchantmentShardItemId(4), kind: "enchantment_shard", quantity: 2 });
    expect(bossReward?.drops).toContainEqual({ itemId: getFactionRuneItemId(4), kind: "faction_rune", quantity: 1 });
    expect(bossReward?.drops).toContainEqual({ itemId: "item_resource_artifact_keeper", kind: "artifact", quantity: 1 });
    expect(inventory.getTotalQuantity(heroId, getFactionRuneItemId(4))).toBe(1);
  });

  it("uses the real Morgana +4% mastery with ranged T4 rewards", () => {
    const world = new World(createRuntimeServices());
    const heroId = world.createEntity();
    const inventory = new PlayerInventoryManager(world, (itemId) => ({ itemId, stackable: true, maxStack: 999 }));
    inventory.createInventory(heroId, 20);
    inventory.setAccessibleStorageOwners(heroId, [heroId]);
    inventory.addQuantity(heroId, MORGANA_T4_DUNGEON.keyItemId, 1);

    const progression = createProgressionFoundation();
    const factionMastery = createFactionMasteryFoundation(progression);
    factionMastery.awardRawFactionFame("Morgana", 96_000);
    expect(factionMastery.getYieldBonusPercent("Morgana")).toBe(4);

    const dungeon = new DungeonRuntime([MORGANA_T4_DUNGEON]);
    expect(dungeon.start(MORGANA_T4_DUNGEON.id, heroId, inventory).ok).toBe(true);
    const rewards = new DungeonRewardRuntime(dungeon, inventory, heroId, () => 0.99);

    for (const encounter of MORGANA_T4_DUNGEON.encounters.slice(0, -1)) {
      rewards.processCurrentEncounterVictory(factionMastery.getYieldBonusPercent);
      expect(dungeon.completeEncounter(encounter.id).ok).toBe(true);
    }

    const bossReward = rewards.processCurrentEncounterVictory(factionMastery.getYieldBonusPercent);
    expect(bossReward?.completionSilver).toBe(Math.round(DUNGEON_COMPLETION_SILVER_BY_TIER[4] * 1.04));
    expect(bossReward?.drops.some((drop) => drop.kind === "faction_rune")).toBe(true);
    expect(inventory.getTotalQuantity(heroId, getFactionRuneItemId(4))).toBeGreaterThanOrEqual(1);
  });
});

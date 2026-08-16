import { describe, expect, it } from "vitest";
import { World, createRuntimeServices } from "@game/core";
import { DungeonRuntime, InventoryManager, type DungeonDefinition } from "@game/gameplay";
import { DungeonCombatRuntimeRouter } from "./DungeonCombatRuntimeRouter.js";
import type { DungeonCombatEncounterSource } from "./DungeonCombatEncounterSource.js";

const DEFINITION: DungeonDefinition = {
  id: "dungeon_router_test",
  tier: 4,
  faction: "test",
  keyItemId: "item_resource_dungeon_key_test",
  combatProfileId: "combat_profile_router_test",
  lootTableId: "loot_router_test",
  encounters: [
    { id: "n1", kind: "normal", monsterDefinitionId: "monster_test_normal" },
    { id: "boss", kind: "boss", monsterDefinitionId: "monster_test_boss" },
  ],
};

function setup(active = true) {
  const world = new World(createRuntimeServices());
  const heroId = world.createEntity();
  const inventory = new InventoryManager(world, (itemId) => ({ itemId, stackable: true, maxStack: 99 }));
  inventory.createInventory(heroId, 4);
  inventory.addQuantity(heroId, DEFINITION.keyItemId, 1);
  const dungeonRuntime = new DungeonRuntime([DEFINITION]);
  if (active) dungeonRuntime.start(DEFINITION.id, heroId, inventory);

  const encounterSource = { spawnCurrentEncounter: () => undefined } as unknown as DungeonCombatEncounterSource;
  return { dungeonRuntime, router: new DungeonCombatRuntimeRouter(dungeonRuntime, encounterSource) };
}

describe("DungeonCombatRuntimeRouter", () => {
  it("uses continuous HP/cooldown policy while a dungeon run is active", () => {
    const { router } = setup(true);
    expect(router.flowPolicy.shouldRestoreHeroHealthBeforeEncounter({ locationChangedAfterVictory: true, enteringBoss: true })).toBe(false);
    expect(router.flowPolicy.shouldResetHeroCooldownsOnEncounterStart({ encounterIndex: 0 })).toBe(false);
  });

  it("routes victories into DungeonRuntime and advances the authored encounter", () => {
    const { dungeonRuntime, router } = setup(true);
    let worldVictories = 0;
    expect(router.onVictory(() => {
      worldVictories += 1;
      return { enteredNewSegment: true };
    })).toEqual({ enteredNewSegment: false });
    expect(worldVictories).toBe(0);
    expect(dungeonRuntime.activeRun?.encounterIndex).toBe(1);
    expect(dungeonRuntime.getActiveEncounter()?.id).toBe("boss");
  });

  it("heals once when returning to world combat after a dungeon ends", () => {
    const { router } = setup(true);
    router.onVictory(() => ({ enteredNewSegment: false }));
    router.onVictory(() => ({ enteredNewSegment: false }));

    expect(router.isDungeonActive()).toBe(false);
    expect(router.flowPolicy.shouldRestoreHeroHealthBeforeEncounter({
      locationChangedAfterVictory: false,
      enteringBoss: false,
    })).toBe(true);
    expect(router.flowPolicy.shouldRestoreHeroHealthBeforeEncounter({
      locationChangedAfterVictory: false,
      enteringBoss: false,
    })).toBe(false);
  });

  it("heals after every completed world segment, including farm-mode repeats", () => {
    const { router } = setup(false);
    router.onVictory(() => ({ enteredNewSegment: true }));

    expect(router.flowPolicy.shouldRestoreHeroHealthBeforeEncounter({
      locationChangedAfterVictory: false,
      enteringBoss: false,
    })).toBe(true);
  });

  it("routes defeat into DungeonRuntime without advancing world progression", () => {
    const { dungeonRuntime, router } = setup(true);
    let worldDefeats = 0;
    router.onDefeat(() => { worldDefeats += 1; });
    expect(worldDefeats).toBe(0);
    expect(dungeonRuntime.activeRun?.status).toBe("failed");
  });

  it("falls back to world routing and world flow when no dungeon is active", () => {
    const { router } = setup(false);
    let worldVictories = 0;
    let worldDefeats = 0;
    expect(router.onVictory(() => {
      worldVictories += 1;
      return { enteredNewSegment: false };
    })).toEqual({ enteredNewSegment: false });
    router.onDefeat(() => { worldDefeats += 1; });
    expect(worldVictories).toBe(1);
    expect(worldDefeats).toBe(1);
    expect(router.flowPolicy.shouldRestoreHeroHealthBeforeEncounter({ locationChangedAfterVictory: true, enteringBoss: false })).toBe(true);
    expect(router.flowPolicy.shouldResetHeroCooldownsOnEncounterStart({ encounterIndex: 0 })).toBe(true);
  });
});

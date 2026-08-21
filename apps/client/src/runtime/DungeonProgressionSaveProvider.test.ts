import { describe, expect, it } from "vitest";
import { DungeonRuntime, type DungeonDefinition } from "@game/gameplay";
import { DungeonProgressionSaveProvider } from "./DungeonProgressionSaveProvider.js";

const T4_DUNGEON: DungeonDefinition = {
  id: "dungeon_t4_persistence_test",
  tier: 4,
  faction: "test",
  keyItemId: "item_key_t4_test",
  combatProfileId: "combat_profile_t4_test",
  lootTableId: "loot_table_t4_test",
  encounters: [
    { id: "t4_boss", kind: "boss", monsterDefinitionId: "monster_t4_boss_test" },
  ],
};

const T5_DUNGEON: DungeonDefinition = {
  ...T4_DUNGEON,
  id: "dungeon_t5_persistence_test",
  tier: 5,
  keyItemId: "item_key_t5_test",
  combatProfileId: "combat_profile_t5_test",
  lootTableId: "loot_table_t5_test",
  encounters: [
    { id: "t5_boss", kind: "boss", monsterDefinitionId: "monster_t5_boss_test" },
  ],
};

describe("DungeonProgressionSaveProvider", () => {
  it("saves and restores cleared dungeon progression", () => {
    const sourceRuntime = new DungeonRuntime([T4_DUNGEON, T5_DUNGEON]);
    sourceRuntime.restoreClearedDefinitionIds([T4_DUNGEON.id]);
    const payload = new DungeonProgressionSaveProvider(sourceRuntime).save();

    const restoredRuntime = new DungeonRuntime([T4_DUNGEON, T5_DUNGEON]);
    new DungeonProgressionSaveProvider(restoredRuntime).load(payload);

    expect(restoredRuntime.getClearedDefinitionIds()).toEqual([T4_DUNGEON.id]);
    expect(restoredRuntime.getClearedTiers()).toEqual([4]);
    expect(restoredRuntime.canAccessDefinition(T5_DUNGEON.id)).toBe(true);
  });

  it("ignores unknown definitions and malformed entries on load", () => {
    const runtime = new DungeonRuntime([T4_DUNGEON, T5_DUNGEON]);
    const provider = new DungeonProgressionSaveProvider(runtime);

    provider.load({
      clearedDefinitionIds: [T4_DUNGEON.id, "unknown_dungeon", 5, null],
    });

    expect(runtime.getClearedDefinitionIds()).toEqual([T4_DUNGEON.id]);
    expect(runtime.getClearedTiers()).toEqual([4]);
  });

  it("resets progression when the provider payload is absent", () => {
    const runtime = new DungeonRuntime([T4_DUNGEON, T5_DUNGEON]);
    runtime.restoreClearedDefinitionIds([T4_DUNGEON.id]);

    new DungeonProgressionSaveProvider(runtime).load(undefined);

    expect(runtime.getClearedDefinitionIds()).toEqual([]);
    expect(runtime.getClearedTiers()).toEqual([]);
    expect(runtime.canAccessDefinition(T5_DUNGEON.id)).toBe(false);
  });
});

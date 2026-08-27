import { computeChecksum, type SaveFormat, type SaveMigration } from "@game/persistence";
import { describe, expect, it } from "vitest";
import {
  CURRENT_RUNTIME_SAVE_VERSION,
  createRuntimeMigrationPipeline,
} from "./saveMigrations";

function makeSave(version: number): SaveFormat {
  const payload = { value: version };
  return {
    version,
    metadata: {
      version,
      createdAt: 0,
      updatedAt: 0,
      buildVersion: "test",
      seed: 42,
    },
    payload,
    checksum: computeChecksum(payload),
  };
}

function makeMigration(fromVersion: number): SaveMigration {
  return {
    fromVersion,
    toVersion: fromVersion + 1,
    migrate(save) {
      const payload = { ...save.payload, value: fromVersion + 1 };
      return {
        ...save,
        version: fromVersion + 1,
        metadata: { ...save.metadata, version: fromVersion + 1 },
        payload,
        checksum: computeChecksum(payload),
      };
    },
  };
}

describe("runtime save migration registry", () => {
  it("keeps the current live format at version 8", () => {
    expect(CURRENT_RUNTIME_SAVE_VERSION).toBe(8);
    const pipeline = createRuntimeMigrationPipeline();
    const save = makeSave(8);
    expect(pipeline.migrate(save, 8)).toBe(save);
  });

  it("migrates legacy Fire Staff mastery and item ids from v1 to v2", () => {
    const payload = {
      experience: {
        masteries: [{ masteryId: "mastery_t4_fire_staff", totalLifetimeXp: 12345, maxLevel: 100 }],
      },
      mastery: { unlocked: ["mastery_fire_staff", "mastery_t4_fire_staff"], overflowPool: 50 },
      inventory: {
        inventories: [{
          slots: [
            { position: 0, instanceId: "weapon-1", itemId: "item_weapon_staff_t3_fire", quantity: 1 },
            { position: 1, instanceId: "weapon-2", itemId: "item_weapon_staff_t4_fire", quantity: 1 },
          ],
          activeBag: null,
        }],
      },
      equipment: {
        equipments: [{
          slots: [{ slot: "weapon", instanceId: "weapon-3", itemId: "item_weapon_staff_t4_fire", quantity: 1 }],
        }],
      },
      unrelated: "fire_staff",
    };
    const save: SaveFormat = {
      version: 1,
      metadata: { version: 1, createdAt: 0, updatedAt: 0, buildVersion: "test", seed: 42 },
      payload,
      checksum: computeChecksum(payload),
    };

    const migrated = createRuntimeMigrationPipeline({ currentVersion: 2 }).migrate(save, 2);
    expect(migrated.version).toBe(2);
    expect(migrated.metadata.version).toBe(2);
    expect(migrated.payload).toEqual({
      experience: {
        masteries: [{ masteryId: "mastery_infernal_staff", totalLifetimeXp: 12345, maxLevel: 100 }],
      },
      mastery: { unlocked: ["mastery_fire_staff", "mastery_infernal_staff"], overflowPool: 50 },
      inventory: {
        inventories: [{
          slots: [
            { position: 0, instanceId: "weapon-1", itemId: "item_weapon_staff_t3_infernal", quantity: 1 },
            { position: 1, instanceId: "weapon-2", itemId: "item_weapon_staff_t4_infernal", quantity: 1 },
          ],
          activeBag: null,
        }],
      },
      equipment: {
        equipments: [{
          slots: [{ slot: "weapon", instanceId: "weapon-3", itemId: "item_weapon_staff_t4_infernal", quantity: 1 }],
        }],
      },
      unrelated: "fire_staff",
    });
    expect(migrated.checksum).toBe(computeChecksum(migrated.payload));
  });

  it("converts every legacy faction key and key fragment to the shared T4 currency", () => {
    const payload = {
      inventory: {
        inventories: [{
          slots: [
            { position: 0, itemId: "item_resource_dungeon_key_keeper", quantity: 2 },
            { position: 1, itemId: "item_resource_dungeon_key_heretic", quantity: 1 },
            { position: 2, itemId: "item_resource_key_fragment_undead", quantity: 17 },
            { position: 3, itemId: "item_resource_key_fragment_morgana", quantity: 9 },
            { position: 4, itemId: "item_resource_dungeon_key_t4", quantity: 3 },
          ],
        }],
      },
    };
    const save: SaveFormat = {
      version: 2,
      metadata: { version: 2, createdAt: 0, updatedAt: 0, buildVersion: "test", seed: 42 },
      payload,
      checksum: computeChecksum(payload),
    };

    const migrated = createRuntimeMigrationPipeline({ currentVersion: 3 }).migrate(save, 3);
    const slots = ((migrated.payload.inventory as { inventories: Array<{ slots: Array<{ itemId: string }> }> }).inventories[0]?.slots ?? []);
    expect(slots.map(({ itemId }) => itemId)).toEqual([
      "item_resource_dungeon_key_t4",
      "item_resource_dungeon_key_t4",
      "item_resource_dungeon_key_fragment_t4",
      "item_resource_dungeon_key_fragment_t4",
      "item_resource_dungeon_key_t4",
    ]);
    expect(migrated.version).toBe(3);
    expect(migrated.checksum).toBe(computeChecksum(migrated.payload));
  });

  it("removes obsolete faction Relic inventory objects from v3 saves", () => {
    const payload = {
      inventory: {
        inventories: [{
          capacity: 24,
          nextInstanceCounter: 8,
          slots: [
            { position: 0, instanceId: "0", itemId: "item_relic_keeper", quantity: 1 },
            { position: 1, instanceId: "1", itemId: "item_relic_heretic", quantity: 1 },
            { position: 2, instanceId: "2", itemId: "item_relic_undead", quantity: 1 },
            { position: 3, instanceId: "3", itemId: "item_relic_morgana", quantity: 1 },
            { position: 4, instanceId: "4", itemId: "item_relic_dungeon", quantity: 1 },
            { position: 5, instanceId: "5", itemId: "item_resource_wood_t3", quantity: 7 },
          ],
          activeBag: null,
        }],
      },
      unrelated: { oldRelicReference: "item_relic_keeper" },
    };
    const save: SaveFormat = {
      version: 3,
      metadata: { version: 3, createdAt: 0, updatedAt: 0, buildVersion: "test", seed: 42 },
      payload,
      checksum: computeChecksum(payload),
    };

    const migrated = createRuntimeMigrationPipeline({ currentVersion: 4 }).migrate(save, 4);
    const slots = ((migrated.payload.inventory as { inventories: Array<{ slots: Array<{ itemId: string }> }> }).inventories[0]?.slots ?? []);
    expect(slots.map(({ itemId }) => itemId)).toEqual([
      "item_relic_dungeon",
      "item_resource_wood_t3",
    ]);
    expect((migrated.payload.unrelated as { oldRelicReference: string }).oldRelicReference)
      .toBe("item_relic_keeper");
    expect(migrated.version).toBe(4);
    expect(migrated.checksum).toBe(computeChecksum(migrated.payload));
  });

  it("merges legacy faction-specific runes into the common tiered Rune family", () => {
    const payload = {
      inventory: {
        inventories: [{
          slots: [
            { position: 0, itemId: "item_resource_rune_keeper_t4", quantity: 2 },
            { position: 1, itemId: "item_resource_rune_heretic_t4", quantity: 3 },
            { position: 2, itemId: "item_resource_rune_undead_t6", quantity: 4 },
            { position: 3, itemId: "item_resource_rune_morgana_t8", quantity: 5 },
          ],
        }],
      },
      recipeReference: "item_resource_rune_keeper_t4",
    };
    const save: SaveFormat = {
      version: 4,
      metadata: { version: 4, createdAt: 0, updatedAt: 0, buildVersion: "test", seed: 42 },
      payload,
      checksum: computeChecksum(payload),
    };

    const migrated = createRuntimeMigrationPipeline({ currentVersion: 5 }).migrate(save, 5);
    const slots = ((migrated.payload.inventory as { inventories: Array<{ slots: Array<{ itemId: string }> }> }).inventories[0]?.slots ?? []);
    expect(slots.map(({ itemId }) => itemId)).toEqual([
      "item_resource_rune_faction_t4",
      "item_resource_rune_faction_t4",
      "item_resource_rune_faction_t6",
      "item_resource_rune_faction_t8",
    ]);
    expect(migrated.payload.recipeReference).toBe("item_resource_rune_faction_t4");
    expect(migrated.version).toBe(5);
    expect(migrated.checksum).toBe(computeChecksum(migrated.payload));
  });

  it("repairs an exact activeBag duplicate from a V5 inventory without changing the bag identity", () => {
    const payload = {
      inventory: {
        inventories: [{
          capacity: 24,
          nextInstanceCounter: 7,
          activeBag: {
            instanceId: "item_1",
            itemId: "item_bag_t4",
            quantity: 1,
            enchantment: 0,
          },
          slots: [
            {
              position: 0,
              instanceId: "item_1",
              itemId: "item_bag_t4",
              quantity: 1,
              enchantment: 0,
            },
            {
              position: 1,
              instanceId: "item_2",
              itemId: "item_resource_wood_t4",
              quantity: 12,
              enchantment: 0,
            },
          ],
        }],
      },
      awakening: {
        version: 2,
        weapons: [{ itemInstanceId: "weapon_9", strain: 42 }],
      },
    };
    const save: SaveFormat = {
      version: 5,
      metadata: { version: 5, createdAt: 0, updatedAt: 0, buildVersion: "test", seed: 42 },
      payload,
      checksum: computeChecksum(payload),
    };

    const migrated = createRuntimeMigrationPipeline({ currentVersion: 6 }).migrate(save, 6);
    const inventory = (migrated.payload.inventory as {
      inventories: Array<{ activeBag: { instanceId: string }; slots: Array<{ instanceId: string }> }>;
    }).inventories[0];
    expect(inventory?.activeBag.instanceId).toBe("item_1");
    expect(inventory?.slots.map(({ instanceId }) => instanceId)).toEqual(["item_2"]);
    expect(migrated.payload.awakening).toEqual(payload.awakening);
    expect(migrated.version).toBe(6);
    expect(migrated.metadata.version).toBe(6);
    expect(migrated.checksum).toBe(computeChecksum(migrated.payload));
  });

  it("does not silently repair an ambiguous duplicate that differs from activeBag in V6", () => {
    const payload = {
      inventory: {
        inventories: [{
          activeBag: { instanceId: "item_1", itemId: "item_bag_t4", quantity: 1 },
          slots: [
            { position: 0, instanceId: "item_1", itemId: "item_weapon_broadsword_t4", quantity: 1 },
          ],
        }],
      },
    };
    const save: SaveFormat = {
      version: 5,
      metadata: { version: 5, createdAt: 0, updatedAt: 0, buildVersion: "test", seed: 42 },
      payload,
      checksum: computeChecksum(payload),
    };

    const migrated = createRuntimeMigrationPipeline({ currentVersion: 6 }).migrate(save, 6);
    const inventory = (migrated.payload.inventory as {
      inventories: Array<{ slots: Array<{ instanceId: string; itemId: string }> }>;
    }).inventories[0];
    expect(inventory?.slots).toEqual(payload.inventory.inventories[0]?.slots);
  });

  it("recovers V6 duplicate slot instance ids without deleting either item", () => {
    const payload = {
      inventory: {
        inventories: [{
          capacity: 24,
          nextInstanceCounter: 3,
          activeBag: null,
          slots: [
            { position: 0, instanceId: "item_1", itemId: "item_resource_wood_t4", quantity: 10, enchantment: 0 },
            { position: 1, instanceId: "item_1", itemId: "item_resource_stone_t4", quantity: 12, enchantment: 0 },
            { position: 2, instanceId: "item_2", itemId: "item_resource_hide_t4", quantity: 8, enchantment: 0 },
          ],
        }],
      },
    };
    const save: SaveFormat = {
      version: 6,
      metadata: { version: 6, createdAt: 0, updatedAt: 0, buildVersion: "test", seed: 42 },
      payload,
      checksum: computeChecksum(payload),
    };

    const migrated = createRuntimeMigrationPipeline({ currentVersion: 7 }).migrate(save, 7);
    const inventory = (migrated.payload.inventory as {
      inventories: Array<{
        nextInstanceCounter: number;
        slots: Array<{ position: number; instanceId: string; itemId: string; quantity: number }>;
      }>;
    }).inventories[0];

    expect(inventory?.slots).toEqual([
      { position: 0, instanceId: "item_1", itemId: "item_resource_wood_t4", quantity: 10, enchantment: 0 },
      { position: 1, instanceId: "item_3", itemId: "item_resource_stone_t4", quantity: 12, enchantment: 0 },
      { position: 2, instanceId: "item_2", itemId: "item_resource_hide_t4", quantity: 8, enchantment: 0 },
    ]);
    expect(inventory?.nextInstanceCounter).toBe(4);
    expect(migrated.version).toBe(7);
    expect(migrated.metadata.version).toBe(7);
    expect(migrated.checksum).toBe(computeChecksum(migrated.payload));
  });

  it("recovers already-V7 duplicate slot instance ids when migrating to V8", () => {
    const payload = {
      inventory: {
        inventories: [{
          capacity: 48,
          nextInstanceCounter: 42,
          activeBag: null,
          slots: [
            { position: 0, instanceId: "item_41", itemId: "item_resource_wood_t4", quantity: 10, enchantment: 0 },
            { position: 1, instanceId: "item_41", itemId: "item_resource_stone_t4", quantity: 12, enchantment: 0 },
          ],
        }],
      },
    };
    const save: SaveFormat = {
      version: 7,
      metadata: { version: 7, createdAt: 0, updatedAt: 0, buildVersion: "test", seed: 42 },
      payload,
      checksum: computeChecksum(payload),
    };

    const migrated = createRuntimeMigrationPipeline().migrate(save, 8);
    const inventory = (migrated.payload.inventory as {
      inventories: Array<{
        nextInstanceCounter: number;
        slots: Array<{ position: number; instanceId: string; itemId: string; quantity: number }>;
      }>;
    }).inventories[0];

    expect(inventory?.slots).toHaveLength(2);
    expect(inventory?.slots[0]?.instanceId).toBe("item_41");
    expect(inventory?.slots[1]?.instanceId).toBe("item_42");
    expect(inventory?.nextInstanceCounter).toBe(43);
    expect(migrated.version).toBe(8);
    expect(migrated.metadata.version).toBe(8);
    expect(migrated.checksum).toBe(computeChecksum(migrated.payload));
  });

  it("keeps the externally referenced item canonical when duplicate slots disagree", () => {
    const payload = {
      inventory: {
        inventories: [{
          capacity: 24,
          nextInstanceCounter: 5,
          activeBag: null,
          slots: [
            { position: 0, instanceId: "item_1", itemId: "item_resource_wood_t4", quantity: 1 },
            { position: 1, instanceId: "item_1", itemId: "item_weapon_broadsword_t4", quantity: 1 },
          ],
        }],
      },
      equipment: {
        equipments: [{
          slots: [{ slot: "weapon", instanceId: "item_1", itemId: "item_weapon_broadsword_t4", quantity: 1 }],
        }],
      },
    };
    const save: SaveFormat = {
      version: 6,
      metadata: { version: 6, createdAt: 0, updatedAt: 0, buildVersion: "test", seed: 42 },
      payload,
      checksum: computeChecksum(payload),
    };

    const migrated = createRuntimeMigrationPipeline({ currentVersion: 7 }).migrate(save, 7);
    const slots = (migrated.payload.inventory as {
      inventories: Array<{ slots: Array<{ instanceId: string; itemId: string }> }>;
    }).inventories[0]?.slots ?? [];

    expect(slots.find(({ itemId }) => itemId === "item_weapon_broadsword_t4")?.instanceId).toBe("item_1");
    expect(slots.find(({ itemId }) => itemId === "item_resource_wood_t4")?.instanceId).not.toBe("item_1");
  });

  it("builds a complete contiguous migration path", () => {
    const pipeline = createRuntimeMigrationPipeline({
      currentVersion: 8,
      earliestSupportedVersion: 1,
      migrations: [
        makeMigration(1),
        makeMigration(2),
        makeMigration(3),
        makeMigration(4),
        makeMigration(5),
        makeMigration(6),
        makeMigration(7),
      ],
    });
    expect(pipeline.migrate(makeSave(1), 8).version).toBe(8);
  });

  it("rejects a version bump with a missing migration", () => {
    expect(() => createRuntimeMigrationPipeline({
      currentVersion: 4,
      earliestSupportedVersion: 1,
      migrations: [makeMigration(1), makeMigration(2)],
    })).toThrow("Missing runtime save migration v3 -> v4");
  });

  it("rejects migrations that skip versions", () => {
    const invalid: SaveMigration = {
      fromVersion: 1,
      toVersion: 3,
      migrate: (save) => save,
    };

    expect(() => createRuntimeMigrationPipeline({
      currentVersion: 4,
      earliestSupportedVersion: 1,
      migrations: [invalid],
    })).toThrow("must target the next version");
  });
});

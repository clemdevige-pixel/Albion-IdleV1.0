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
  it("keeps the current live format at version 5", () => {
    expect(CURRENT_RUNTIME_SAVE_VERSION).toBe(5);
    const pipeline = createRuntimeMigrationPipeline();
    const save = makeSave(5);
    expect(pipeline.migrate(save, 5)).toBe(save);
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

    const migrated = createRuntimeMigrationPipeline().migrate(save, 5);
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

  it("builds a complete contiguous migration path", () => {
    const pipeline = createRuntimeMigrationPipeline({
      currentVersion: 5,
      earliestSupportedVersion: 1,
      migrations: [makeMigration(1), makeMigration(2), makeMigration(3), makeMigration(4)],
    });
    expect(pipeline.migrate(makeSave(1), 5).version).toBe(5);
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

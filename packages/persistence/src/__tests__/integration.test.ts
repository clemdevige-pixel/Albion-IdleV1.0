import { describe, it, expect } from "vitest";
import { SaveManager } from "../save-manager.js";
import { InMemorySaveRepository } from "../save-repository.js";
import { VersionManager } from "../version-manager.js";
import { MigrationPipeline } from "../migration.js";
import { computeChecksum } from "../serializer.js";
import type { SaveProvider } from "../save-provider.js";
import type { SaveMigration } from "../migration.js";
import type { SaveFormat } from "../save-format.js";

class InventoryProvider implements SaveProvider {
  readonly providerId = "inventory";
  items: string[] = [];

  save(): unknown {
    return { items: [...this.items] };
  }

  load(data: unknown): void {
    const d = data as { items: string[] };
    this.items = [...d.items];
  }
}

class StatsProvider implements SaveProvider {
  readonly providerId = "stats";
  level = 1;
  xp = 0;

  save(): unknown {
    return { level: this.level, xp: this.xp };
  }

  load(data: unknown): void {
    const d = data as { level: number; xp: number };
    this.level = d.level;
    this.xp = d.xp;
  }
}

describe("Integration: full save/load pipeline", () => {
  it("saves, serializes, stores, loads, and restores without data loss", () => {
    const repo = new InMemorySaveRepository();
    const manager = new SaveManager({
      repository: repo,
      versionManager: new VersionManager(1),
      migrationPipeline: new MigrationPipeline(),
      buildVersion: "1.0.0",
      seed: 12345,
    });

    const inventory = new InventoryProvider();
    const stats = new StatsProvider();
    manager.registerProvider(inventory);
    manager.registerProvider(stats);

    inventory.items = ["sword", "shield", "potion"];
    stats.level = 5;
    stats.xp = 2500;

    manager.save("main", 100);

    inventory.items = [];
    stats.level = 1;
    stats.xp = 0;

    manager.load("main");

    expect(inventory.items).toEqual(["sword", "shield", "potion"]);
    expect(stats.level).toBe(5);
    expect(stats.xp).toBe(2500);
  });

  it("migrates old saves before loading", () => {
    const repo = new InMemorySaveRepository();
    const pipeline = new MigrationPipeline();

    const v1to2: SaveMigration = {
      fromVersion: 1,
      toVersion: 2,
      migrate(save: SaveFormat): SaveFormat {
        const payload = { ...save.payload };
        const stats = payload["stats"] as Record<string, unknown> | undefined;
        if (stats && !("gold" in stats)) {
          payload["stats"] = { ...stats, gold: 0 };
        }
        return {
          ...save,
          version: 2,
          payload,
          checksum: computeChecksum(payload),
        };
      },
    };
    pipeline.register(v1to2);

    const oldPayload = {
      stats: { level: 3, xp: 1000 },
    };
    const oldSave: SaveFormat = {
      version: 1,
      metadata: {
        version: 1,
        createdAt: 0,
        updatedAt: 50,
        buildVersion: "0.9.0",
        seed: 99,
      },
      payload: oldPayload,
      checksum: computeChecksum(oldPayload),
    };
    repo.save("legacy", oldSave);

    const manager = new SaveManager({
      repository: repo,
      versionManager: new VersionManager(2),
      migrationPipeline: pipeline,
      buildVersion: "1.0.0",
      seed: 99,
    });

    const statsProvider: SaveProvider = {
      providerId: "stats",
      save: () => ({}),
      load(data: unknown) {
        const d = data as { level: number; xp: number; gold: number };
        expect(d.gold).toBe(0);
        expect(d.level).toBe(3);
      },
    };
    manager.registerProvider(statsProvider);

    manager.load("legacy");
  });
});

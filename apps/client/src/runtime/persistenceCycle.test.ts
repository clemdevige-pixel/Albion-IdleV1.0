import { describe, expect, it } from "vitest";
import {
  InMemorySaveRepository,
  MigrationPipeline,
  SaveManager,
  VersionManager,
  type SaveProvider,
} from "@game/persistence";
import { backupCurrentSave, loadSaveWithBackup } from "./saveBackup";

class RuntimeStateProvider implements SaveProvider {
  public readonly providerId = "runtime-state";
  public state = {
    health: 500,
    silver: 0,
    segment: 1,
  };

  public save(): unknown {
    return { ...this.state };
  }

  public load(data: unknown): void {
    const loadedState = data as typeof this.state;
    this.state = { ...loadedState };
  }
}

function createSaveManager(repository: InMemorySaveRepository): SaveManager {
  return new SaveManager({
    repository,
    versionManager: new VersionManager(1),
    migrationPipeline: new MigrationPipeline(),
    buildVersion: "persistence-cycle-test",
    seed: 42,
  });
}

describe("runtime persistence cycle", () => {
  it("keeps the previous snapshot and reloads the latest primary save", () => {
    const repository = new InMemorySaveRepository();
    const manager = createSaveManager(repository);
    const provider = new RuntimeStateProvider();
    manager.registerProvider(provider);

    provider.state = { health: 450, silver: 120, segment: 2 };
    manager.save("primary", 10);

    provider.state = { health: 300, silver: 480, segment: 4 };
    expect(backupCurrentSave(repository, "primary", "backup")).toBe(true);
    manager.save("primary", 20);

    provider.state = { health: 1, silver: 0, segment: 1 };
    manager.load("primary");

    expect(provider.state).toEqual({ health: 300, silver: 480, segment: 4 });
    expect(repository.get("backup").payload[provider.providerId]).toEqual({
      health: 450,
      silver: 120,
      segment: 2,
    });
  });

  it("restores the last valid backup when the primary save is corrupted", () => {
    const repository = new InMemorySaveRepository();
    const manager = createSaveManager(repository);
    const provider = new RuntimeStateProvider();
    manager.registerProvider(provider);

    provider.state = { health: 420, silver: 250, segment: 3 };
    manager.save("primary", 10);
    backupCurrentSave(repository, "primary", "backup");

    const corrupted = repository.get("primary");
    repository.save("primary", {
      ...corrupted,
      payload: {
        ...corrupted.payload,
        [provider.providerId]: { health: 0, silver: 999999, segment: 10 },
      },
    });
    provider.state = { health: 1, silver: 0, segment: 1 };

    const source = loadSaveWithBackup(
      repository,
      "primary",
      "backup",
      (slotId) => { manager.load(slotId); },
    );

    expect(source).toBe("backup");
    expect(provider.state).toEqual({ health: 420, silver: 250, segment: 3 });
    expect(repository.get("primary")).toEqual(repository.get("backup"));
  });

  it("exports and imports a complete validated runtime snapshot", () => {
    const sourceRepository = new InMemorySaveRepository();
    const sourceManager = createSaveManager(sourceRepository);
    const sourceProvider = new RuntimeStateProvider();
    sourceManager.registerProvider(sourceProvider);
    sourceProvider.state = { health: 275, silver: 840, segment: 6 };
    sourceManager.save("primary", 30);

    const portableSave = sourceManager.exportSave("primary");
    const targetRepository = new InMemorySaveRepository();
    const targetManager = createSaveManager(targetRepository);
    const targetProvider = new RuntimeStateProvider();
    targetManager.registerProvider(targetProvider);

    targetManager.importSave("primary", portableSave);
    targetManager.load("primary");

    expect(targetProvider.state).toEqual({ health: 275, silver: 840, segment: 6 });
    expect(targetManager.exportSave("primary")).toBe(portableSave);
  });
});

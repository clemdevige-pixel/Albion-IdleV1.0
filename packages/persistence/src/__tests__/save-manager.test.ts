import { describe, it, expect } from "vitest";
import { SaveManager } from "../save-manager.js";
import { InMemorySaveRepository } from "../save-repository.js";
import { VersionManager } from "../version-manager.js";
import { MigrationPipeline } from "../migration.js";
import type { SaveProvider } from "../save-provider.js";

class MockProvider implements SaveProvider {
  readonly providerId: string;
  state: Record<string, unknown>;

  constructor(id: string, initial: Record<string, unknown>) {
    this.providerId = id;
    this.state = initial;
  }

  save(): unknown {
    return { ...this.state };
  }

  load(data: unknown): void {
    this.state = data as Record<string, unknown>;
  }
}

function createManager(): SaveManager {
  return new SaveManager({
    repository: new InMemorySaveRepository(),
    versionManager: new VersionManager(1),
    migrationPipeline: new MigrationPipeline(),
    buildVersion: "0.1.0",
    seed: 42,
  });
}

describe("SaveManager", () => {
  it("save and load roundtrip preserves data", () => {
    const manager = createManager();
    const provider = new MockProvider("test", { hp: 100, name: "hero" });
    manager.registerProvider(provider);

    manager.save("slot1", 10);

    provider.state = { hp: 0, name: "dead" };
    manager.load("slot1");

    expect(provider.state).toEqual({ hp: 100, name: "hero" });
  });

  it("lists and deletes saves", () => {
    const manager = createManager();
    manager.registerProvider(new MockProvider("p", {}));

    manager.save("a", 0);
    manager.save("b", 0);
    expect(manager.list()).toEqual(["a", "b"]);

    manager.delete("a");
    expect(manager.list()).toEqual(["b"]);
  });

  it("has checks existence", () => {
    const manager = createManager();
    manager.registerProvider(new MockProvider("p", {}));

    expect(manager.has("x")).toBe(false);
    manager.save("x", 0);
    expect(manager.has("x")).toBe(true);
  });

  it("exports and imports a validated portable save", () => {
    const source = createManager();
    const sourceProvider = new MockProvider("test", { hp: 75 });
    source.registerProvider(sourceProvider);
    source.save("source", 12);

    const portable = source.exportSave("source");
    const target = createManager();
    const targetProvider = new MockProvider("test", { hp: 1 });
    target.registerProvider(targetProvider);
    target.importSave("target", portable);
    target.load("target");

    expect(targetProvider.state).toEqual({ hp: 75 });
  });

  it("does not replace a slot when an imported checksum is invalid", () => {
    const manager = createManager();
    const provider = new MockProvider("test", { hp: 100 });
    manager.registerProvider(provider);
    manager.save("slot", 10);
    const original = manager.exportSave("slot");
    const corrupted = JSON.parse(original) as {
      payload: { test: { hp: number } };
    };
    corrupted.payload.test.hp = 0;

    expect(() => manager.importSave("slot", JSON.stringify(corrupted))).toThrow(
      /Checksum mismatch/,
    );
    expect(manager.exportSave("slot")).toBe(original);
  });

  it("rejects a save created by a newer incompatible version", () => {
    const source = createManager();
    source.registerProvider(new MockProvider("test", { hp: 100 }));
    source.save("slot", 10);
    const future = JSON.parse(source.exportSave("slot")) as {
      version: number;
      metadata: { version: number };
    };
    future.version = 2;
    future.metadata.version = 2;

    expect(() => source.importSave("future", JSON.stringify(future))).toThrow(
      /Version mismatch/,
    );
    expect(source.has("future")).toBe(false);
  });
});

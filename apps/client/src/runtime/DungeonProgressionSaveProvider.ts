import type { SaveProvider } from "@game/persistence";
import type { DungeonRuntime } from "@game/gameplay";

interface SavedDungeonProgression {
  readonly clearedDefinitionIds: readonly string[];
}

export class DungeonProgressionSaveProvider implements SaveProvider {
  readonly providerId = "dungeon_progression";

  constructor(private readonly dungeonRuntime: DungeonRuntime) {}

  save(): unknown {
    return {
      clearedDefinitionIds: this.dungeonRuntime.getClearedDefinitionIds(),
    } satisfies SavedDungeonProgression;
  }

  load(data: unknown): void {
    if (data === null || typeof data !== "object" || !("clearedDefinitionIds" in data)) {
      this.dungeonRuntime.restoreClearedDefinitionIds([]);
      return;
    }

    const raw = (data as { clearedDefinitionIds?: unknown }).clearedDefinitionIds;
    const clearedDefinitionIds = Array.isArray(raw)
      ? raw.filter((value): value is string => typeof value === "string")
      : [];
    this.dungeonRuntime.restoreClearedDefinitionIds(clearedDefinitionIds);
  }
}

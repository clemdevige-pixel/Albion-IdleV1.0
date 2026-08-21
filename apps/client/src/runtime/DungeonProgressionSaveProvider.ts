import type { SaveProvider } from "@game/persistence";
import type { DungeonRuntime } from "@game/gameplay";

interface SavedDungeonProgression {
  readonly clearedDefinitionIds: readonly string[];
  readonly completedDefinitionCounts?: Readonly<Record<string, number>>;
}

export class DungeonProgressionSaveProvider implements SaveProvider {
  readonly providerId = "dungeon_progression";

  constructor(private readonly dungeonRuntime: DungeonRuntime) {}

  save(): unknown {
    return {
      clearedDefinitionIds: this.dungeonRuntime.getClearedDefinitionIds(),
      completedDefinitionCounts: this.dungeonRuntime.getCompletedDefinitionCounts(),
    } satisfies SavedDungeonProgression;
  }

  load(data: unknown): void {
    if (data === null || typeof data !== "object" || !("clearedDefinitionIds" in data)) {
      this.dungeonRuntime.restoreClearedDefinitionIds([]);
      this.dungeonRuntime.restoreCompletedDefinitionCounts({});
      return;
    }

    const raw = (data as { clearedDefinitionIds?: unknown }).clearedDefinitionIds;
    const clearedDefinitionIds = Array.isArray(raw)
      ? raw.filter((value): value is string => typeof value === "string")
      : [];
    this.dungeonRuntime.restoreClearedDefinitionIds(clearedDefinitionIds);

    const rawCounts = (data as { completedDefinitionCounts?: unknown }).completedDefinitionCounts;
    if (rawCounts === null || typeof rawCounts !== "object" || Array.isArray(rawCounts)) {
      this.dungeonRuntime.restoreCompletedDefinitionCounts({});
      return;
    }

    const completedDefinitionCounts = Object.fromEntries(
      Object.entries(rawCounts).filter((entry): entry is [string, number] => (
        typeof entry[1] === "number"
        && Number.isSafeInteger(entry[1])
        && entry[1] > 0
      )),
    );
    this.dungeonRuntime.restoreCompletedDefinitionCounts(completedDefinitionCounts);
  }
}

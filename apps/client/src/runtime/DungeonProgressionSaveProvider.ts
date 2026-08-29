import type { SaveProvider } from "@game/persistence";
import type { DungeonRuntime } from "@game/gameplay";
import { dungeonCompletionFlow } from "./DungeonCompletionFlow.js";

interface SavedDungeonProgression {
  readonly clearedDefinitionIds: readonly string[];
  readonly completedDefinitionCounts?: Readonly<Record<string, number>>;
  readonly completionRecap?: unknown;
}

export class DungeonProgressionSaveProvider implements SaveProvider {
  readonly providerId = "dungeon_progression";

  constructor(private readonly dungeonRuntime: DungeonRuntime) {}

  save(): unknown {
    return {
      clearedDefinitionIds: this.dungeonRuntime.getClearedDefinitionIds(),
      completedDefinitionCounts: this.dungeonRuntime.getCompletedDefinitionCounts(),
      completionRecap: dungeonCompletionFlow.getSaveState(),
    } satisfies SavedDungeonProgression;
  }

  load(data: unknown): void {
    if (data === null || typeof data !== "object" || !("clearedDefinitionIds" in data)) {
      this.dungeonRuntime.restoreClearedDefinitionIds([]);
      this.dungeonRuntime.restoreCompletedDefinitionCounts({});
      dungeonCompletionFlow.restoreSaveState(null);
      return;
    }

    const saved = data as SavedDungeonProgression;
    const raw = saved.clearedDefinitionIds;
    const clearedDefinitionIds = Array.isArray(raw)
      ? raw.filter((value): value is string => typeof value === "string")
      : [];
    this.dungeonRuntime.restoreClearedDefinitionIds(clearedDefinitionIds);

    const rawCounts = saved.completedDefinitionCounts;
    if (rawCounts === null || typeof rawCounts !== "object" || Array.isArray(rawCounts)) {
      this.dungeonRuntime.restoreCompletedDefinitionCounts({});
    } else {
      const completedDefinitionCounts = Object.fromEntries(
        Object.entries(rawCounts).filter((entry): entry is [string, number] => (
          typeof entry[1] === "number"
          && Number.isSafeInteger(entry[1])
          && entry[1] > 0
        )),
      );
      this.dungeonRuntime.restoreCompletedDefinitionCounts(completedDefinitionCounts);
    }

    dungeonCompletionFlow.restoreSaveState(saved.completionRecap ?? null);
  }
}

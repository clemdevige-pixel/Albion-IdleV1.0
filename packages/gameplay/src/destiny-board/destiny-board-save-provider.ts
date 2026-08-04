import type { SaveProvider } from "@game/persistence";
import { z } from "zod";
import { asDestinyNodeId, type DestinyNodeId } from "./types.js";
import type { DestinyBoardService } from "./destiny-board-service.js";

const destinyBoardSaveSchema = z.object({
  unlocked: z.array(z.string()),
});

/**
 * Persists the set of unlocked Destiny Board node IDs.
 */
export class DestinyBoardSaveProvider implements SaveProvider {
  readonly providerId = "destiny-board";

  constructor(private readonly service: DestinyBoardService) {}

  save(): unknown {
    const ids = [...this.service._getUnlockedSet()];
    ids.sort((a, b) => a.localeCompare(b));
    return { unlocked: ids };
  }

  load(data: unknown): void {
    const parsed = destinyBoardSaveSchema.parse(data);
    const restored = new Set<DestinyNodeId>(
      parsed.unlocked.map((s) => asDestinyNodeId(s)),
    );
    this.service._restoreUnlocked(restored);
  }
}

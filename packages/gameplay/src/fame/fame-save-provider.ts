import type { SaveProvider } from "@game/persistence";
import { z } from "zod";
import { asMasteryId, type MasteryId } from "../experience/types.js";
import type { FameService } from "./fame-service.js";

const fameCategorySchema = z.enum(["combat", "gathering", "crafting", "exploration"]);

const fameRecordSchema = z.object({
  masteryId: z.string(),
  fameEarned: z.number().int().nonnegative(),
  category: fameCategorySchema,
  timestamp: z.number().int().nonnegative(),
});

const fameTotalSchema = z.object({
  masteryId: z.string(),
  total: z.number().int().nonnegative(),
});

const fameSaveSchema = z.object({
  totals: z.array(fameTotalSchema),
  // Accepted only to compact existing saves. Fame history is session-only and
  // must not make persistent snapshots grow once per gameplay reward.
  history: z.array(fameRecordSchema).optional(),
});

export class FameSaveProvider implements SaveProvider {
  readonly providerId = "fame";

  constructor(private readonly service: FameService) {}

  save(): unknown {
    const snapshot = this.service._snapshot();

    const totals: z.infer<typeof fameTotalSchema>[] = [];
    for (const [id, total] of snapshot.totals) {
      totals.push({ masteryId: id, total });
    }
    totals.sort((a, b) => a.masteryId.localeCompare(b.masteryId));

    return { totals };
  }

  load(data: unknown): void {
    const parsed = fameSaveSchema.parse(data);

    const totals = new Map<MasteryId, number>();
    for (const entry of parsed.totals) {
      totals.set(asMasteryId(entry.masteryId), entry.total);
    }

    // Old snapshots may contain an unbounded history. Intentionally discard it
    // while preserving the authoritative per-mastery totals.
    this.service._restore(totals, []);
  }
}

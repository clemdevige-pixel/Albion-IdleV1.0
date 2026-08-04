import type { SaveProvider } from "@game/persistence";
import { z } from "zod";
import { asMasteryId, type MasteryId } from "../experience/types.js";
import type { FameService } from "./fame-service.js";
import type { FameRecord } from "./types.js";

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
  history: z.array(fameRecordSchema),
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

    const history = snapshot.history.map((r) => ({
      masteryId: r.masteryId,
      fameEarned: r.fameEarned,
      category: r.category,
      timestamp: r.timestamp,
    }));

    return { totals, history };
  }

  load(data: unknown): void {
    const parsed = fameSaveSchema.parse(data);

    const totals = new Map<MasteryId, number>();
    for (const entry of parsed.totals) {
      totals.set(asMasteryId(entry.masteryId), entry.total);
    }

    const history: FameRecord[] = parsed.history.map((r) => ({
      masteryId: asMasteryId(r.masteryId),
      fameEarned: r.fameEarned,
      category: r.category,
      timestamp: r.timestamp,
    }));

    this.service._restore(totals, history);
  }
}

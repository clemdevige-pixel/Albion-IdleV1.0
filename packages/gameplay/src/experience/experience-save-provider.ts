import type { SaveProvider } from "@game/persistence";
import { z } from "zod";
import type { ExperienceService } from "./experience-service.js";
import type { ExperienceTable } from "./experience-table.js";
import { asMasteryId, type MasteryId } from "./types.js";

const savedMasterySchema = z.object({
  masteryId: z.string(),
  totalLifetimeXp: z.number().int().nonnegative(),
  maxLevel: z.number().int().positive(),
});

const experienceSaveSchema = z.object({
  masteries: z.array(savedMasterySchema),
});

/** Resolver that provides an ExperienceTable for a given mastery id. */
export type ExperienceTableResolver = (masteryId: MasteryId) => ExperienceTable | undefined;

export class ExperienceSaveProvider implements SaveProvider {
  readonly providerId = "experience";

  constructor(
    private readonly service: ExperienceService,
    private readonly tableResolver: ExperienceTableResolver,
  ) {}

  save(): unknown {
    const snapshot = this.service._snapshot();
    const masteries: z.infer<typeof savedMasterySchema>[] = [];
    for (const [id, data] of snapshot) {
      masteries.push({
        masteryId: id,
        totalLifetimeXp: data.totalLifetimeXp,
        maxLevel: data.maxLevel,
      });
    }
    masteries.sort((a, b) => a.masteryId.localeCompare(b.masteryId));
    return { masteries };
  }

  load(data: unknown): void {
    const parsed = experienceSaveSchema.parse(data);
    for (const entry of parsed.masteries) {
      const masteryId = asMasteryId(entry.masteryId);
      const table = this.tableResolver(masteryId);
      if (table === undefined) {
        throw new Error(`Cannot restore mastery ${entry.masteryId}: no table found`);
      }
      this.service._restore(masteryId, table, entry.maxLevel, entry.totalLifetimeXp);
    }
  }
}

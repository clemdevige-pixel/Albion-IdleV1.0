import type { SaveProvider } from "@game/persistence";
import { z } from "zod";
import { asMasteryId, type MasteryId } from "../experience/types.js";
import type { MasteryService } from "./mastery-service.js";
import type { OverflowConfig } from "./types.js";

const overflowConfigSchema = z.object({
  conversionRate: z.number().nonnegative(),
  enabled: z.boolean(),
});

const masterySaveSchema = z.object({
  unlocked: z.array(z.string()),
  overflowPool: z.number().int().nonnegative(),
  overflowConfig: overflowConfigSchema,
});

/**
 * Persists mastery-specific state: unlocked set and overflow pool.
 * Actual XP/level data is handled by ExperienceSaveProvider.
 */
export class MasterySaveProvider implements SaveProvider {
  readonly providerId = "mastery";

  constructor(private readonly service: MasteryService) {}

  save(): unknown {
    const unlockedIds = [...this.service._getUnlockedSet()];
    unlockedIds.sort((a, b) => a.localeCompare(b));
    const overflow = this.service._getOverflowState();
    return {
      unlocked: unlockedIds,
      overflowPool: overflow.pool,
      overflowConfig: {
        conversionRate: overflow.config.conversionRate,
        enabled: overflow.config.enabled,
      },
    };
  }

  load(data: unknown): void {
    const parsed = masterySaveSchema.parse(data);
    const restored = new Set<MasteryId>(
      parsed.unlocked.map((s) => asMasteryId(s)),
    );
    this.service._restoreUnlocked(restored);
    const config: OverflowConfig = {
      conversionRate: parsed.overflowConfig.conversionRate,
      enabled: parsed.overflowConfig.enabled,
    };
    this.service._restoreOverflow(parsed.overflowPool, config);
  }
}

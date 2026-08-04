import { z } from "zod";

/**
 * Runtime configuration for a simulation instance.
 *
 * Validated at construction so invalid values fail loudly instead of producing
 * a subtly broken simulation.
 */
export const RuntimeConfigSchema = z.object({
  /** Fixed simulation steps per second. Drives the fixed timestep. */
  tickRate: z.number().int().positive().default(20),
  /** Enables optional debug behaviour in consumers. */
  debug: z.boolean().default(false),
  /** Seed for the deterministic RNG. */
  seed: z.number().int().nonnegative().default(1),
  /** Real-time multiplier applied when advancing by wall-clock delta. */
  simulationSpeed: z.number().positive().default(1),
});

export type RuntimeConfigInput = z.input<typeof RuntimeConfigSchema>;
export type RuntimeConfig = z.output<typeof RuntimeConfigSchema>;

/** Validates and normalises a partial runtime configuration. */
export function loadRuntimeConfig(input: RuntimeConfigInput = {}): RuntimeConfig {
  const result = RuntimeConfigSchema.safeParse(input);
  if (!result.success) {
    const issues = result.error.issues
      .map((issue) => `${issue.path.join(".") || "<root>"}: ${issue.message}`)
      .join("; ");
    throw new Error(`Invalid runtime configuration: ${issues}`);
  }
  return result.data;
}

/** Milliseconds of simulation time represented by a single tick. */
export function fixedDeltaMs(config: RuntimeConfig): number {
  return 1000 / config.tickRate;
}

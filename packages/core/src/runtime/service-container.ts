import { loadRuntimeConfig, type RuntimeConfig, type RuntimeConfigInput } from "./config.js";
import { SimulationClock } from "./clock.js";
import { TickEngine } from "./tick-engine.js";
import { Mulberry32Rng, type Rng } from "./rng.js";
import { EventBus } from "./event-bus.js";
import { Scheduler } from "./scheduler.js";
import type { RuntimeEventMap } from "./events.js";
import { createSilentLogger, type Logger } from "./logger.js";

/**
 * The set of runtime services every simulation depends on. Consumers receive
 * this bundle instead of reaching for globals — there is no global singleton.
 */
export interface RuntimeServices {
  readonly config: RuntimeConfig;
  readonly clock: SimulationClock;
  readonly tickEngine: TickEngine;
  readonly rng: Rng;
  readonly eventBus: EventBus<RuntimeEventMap>;
  readonly scheduler: Scheduler;
  readonly logger: Logger;
}

/** Overrides for tests: replace any service with a double. */
export type RuntimeServiceOverrides = Partial<Omit<RuntimeServices, "config">>;

/**
 * Builds a fresh, independent bundle of runtime services from configuration.
 *
 * Every call returns isolated instances, so multiple simulations never share
 * state. Individual services can be replaced via `overrides` in tests.
 */
export function createRuntimeServices(
  configInput: RuntimeConfigInput = {},
  overrides: RuntimeServiceOverrides = {},
): RuntimeServices {
  const config = loadRuntimeConfig(configInput);
  return {
    config,
    clock: overrides.clock ?? new SimulationClock(),
    tickEngine: overrides.tickEngine ?? new TickEngine(),
    rng: overrides.rng ?? new Mulberry32Rng(config.seed),
    eventBus: overrides.eventBus ?? new EventBus<RuntimeEventMap>(),
    scheduler: overrides.scheduler ?? new Scheduler(),
    logger: overrides.logger ?? createSilentLogger(),
  };
}

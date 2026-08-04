import type { Brand } from "../runtime/ids.js";
import type { RuntimeServices } from "../runtime/service-container.js";
import type { World } from "../world/world.js";

/** Strongly-typed system identifier. */
export type SystemId = Brand<string, "SystemId">;

/** Brands a raw string as a {@link SystemId}. */
export function systemId(id: string): SystemId {
  return id as SystemId;
}

/**
 * Everything a system is allowed to touch during an update — no universal,
 * untyped container. Time and randomness come exclusively from Runtime Services.
 */
export interface SystemContext {
  readonly world: World;
  readonly tick: number;
  readonly deltaTime: number;
  readonly services: RuntimeServices;
}

/**
 * A unit of simulation behaviour with a single responsibility.
 *
 * Systems must never read wall-clock time or global randomness directly; they
 * use `context.services` (clock, rng, eventBus, scheduler) instead.
 */
export interface SimulationSystem {
  readonly id: SystemId;
  /** Lower runs earlier. Defaults to 0 when omitted. */
  readonly priority?: number;
  update(context: SystemContext): void;
}

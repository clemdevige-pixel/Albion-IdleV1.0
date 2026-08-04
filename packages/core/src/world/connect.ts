import type { EventBus, RuntimeEventMap, Unsubscribe } from "../runtime/index.js";
import type { World } from "./world.js";

/**
 * Connects a world to the Runtime Core loop.
 *
 * On each `TickAdvanced` event the world runs its systems once. This is the
 * single integration point between time (owned by the loop) and execution
 * (owned by the world): it reuses the existing event bus — no second loop,
 * clock, scheduler or bus is created. Returns an unsubscribe handle.
 *
 * Pausing the loop stops `TickAdvanced` emissions, so the world naturally halts.
 */
export function connectWorldToLoop(world: World, eventBus: EventBus<RuntimeEventMap>): Unsubscribe {
  return eventBus.subscribe("TickAdvanced", () => {
    world.update();
  });
}

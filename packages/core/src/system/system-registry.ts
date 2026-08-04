import { SystemAlreadyRegisteredError, SystemNotFoundError } from "../entity/errors.js";
import type { SimulationSystem, SystemContext, SystemId } from "./system.js";

interface Registration {
  readonly system: SimulationSystem;
  readonly priority: number;
  readonly sequence: number;
}

/**
 * Holds systems and runs them in a deterministic order.
 *
 * Ordering is explicit: ascending `priority`, ties broken by registration order
 * (a monotonic sequence) — never by module import order. The sorted view is
 * cached and invalidated on registration changes.
 */
export class SystemRegistry {
  readonly #systems = new Map<SystemId, Registration>();
  #sequence = 0;
  #ordered: readonly SimulationSystem[] | null = null;

  /** Registers a system. Throws if its id is already registered. */
  register(system: SimulationSystem): void {
    if (this.#systems.has(system.id)) {
      throw new SystemAlreadyRegisteredError(system.id);
    }
    this.#systems.set(system.id, {
      system,
      priority: system.priority ?? 0,
      sequence: this.#sequence++,
    });
    this.#ordered = null;
  }

  /** Removes a system. Throws if it is not registered. */
  unregister(id: SystemId): void {
    if (!this.#systems.delete(id)) {
      throw new SystemNotFoundError(id);
    }
    this.#ordered = null;
  }

  has(id: SystemId): boolean {
    return this.#systems.has(id);
  }

  get(id: SystemId): SimulationSystem | undefined {
    return this.#systems.get(id)?.system;
  }

  get count(): number {
    return this.#systems.size;
  }

  /** Systems in deterministic execution order. */
  ordered(): readonly SimulationSystem[] {
    if (this.#ordered === null) {
      this.#ordered = [...this.#systems.values()]
        .sort((a, b) => a.priority - b.priority || a.sequence - b.sequence)
        .map((registration) => registration.system);
    }
    return this.#ordered;
  }

  /** Executes every system once, in order, with the given context. */
  execute(context: SystemContext): void {
    for (const system of this.ordered()) {
      system.update(context);
    }
  }

  clear(): void {
    this.#systems.clear();
    this.#ordered = null;
    this.#sequence = 0;
  }
}

export type CombatStopState = "running" | "stop_requested" | "paused";

type Listener = () => void;

/**
 * Client-level combat flow controller.
 * It owns only the player's request to stop after the current segment;
 * combat outcomes and world progression remain authoritative elsewhere.
 */
class CombatStopController {
  #state: CombatStopState = "running";
  readonly #listeners = new Set<Listener>();

  getState(): CombatStopState {
    return this.#state;
  }

  isPaused(): boolean {
    return this.#state === "paused";
  }

  isStopRequested(): boolean {
    return this.#state === "stop_requested";
  }

  requestStopAfterSegment(): boolean {
    if (this.#state !== "running") return false;
    this.#setState("stop_requested");
    return true;
  }

  pauseAfterSegment(): boolean {
    if (this.#state !== "stop_requested") return false;
    this.#setState("paused");
    return true;
  }

  resume(): boolean {
    if (this.#state === "running") return false;
    this.#setState("running");
    return true;
  }

  subscribe(listener: Listener): () => void {
    this.#listeners.add(listener);
    return () => { this.#listeners.delete(listener); };
  }

  #setState(next: CombatStopState): void {
    if (next === this.#state) return;
    this.#state = next;
    for (const listener of this.#listeners) listener();
  }
}

export const combatStopController = new CombatStopController();

import type {
  RefiningSessionConfig,
  RefiningSessionId,
  RefiningState,
} from "./refining-types.js";

/**
 * Represents one refining action in progress.
 * Simpler state machine than CraftingSession: idle → refining → completed.
 */
export class RefiningSession {
  readonly id: RefiningSessionId;
  readonly recipeId: string;
  readonly quantity: number;
  readonly config: RefiningSessionConfig;
  readonly startTick: number;

  #state: RefiningState = "idle";

  constructor(
    id: RefiningSessionId,
    recipeId: string,
    quantity: number,
    config: RefiningSessionConfig,
    startTick: number,
  ) {
    this.id = id;
    this.recipeId = recipeId;
    this.quantity = quantity;
    this.config = config;
    this.startTick = startTick;
  }

  get state(): RefiningState {
    return this.#state;
  }

  getRequiredTicks(): number {
    return Math.ceil(this.config.baseRefineTicks * this.config.speedModifier);
  }

  getProgress(currentTick: number): number {
    if (this.#state === "completed") return 1;
    if (this.#state !== "refining") return 0;
    const elapsed = currentTick - this.startTick;
    const required = this.getRequiredTicks();
    return Math.min(1, elapsed / required);
  }

  isComplete(currentTick: number): boolean {
    return currentTick - this.startTick >= this.getRequiredTicks();
  }

  /** Transition from idle → refining. */
  start(): void {
    if (this.#state !== "idle") return;
    this.#state = "refining";
  }

  tick(currentTick: number): void {
    if (this.#state !== "refining") return;
    if (this.isComplete(currentTick)) {
      this.#state = "completed";
    }
  }

  complete(): void {
    if (this.#state !== "refining") return;
    this.#state = "completed";
  }

  cancel(): void {
    if (this.#state === "completed" || this.#state === "failed") return;
    this.#state = "cancelled";
  }

  fail(): void {
    if (this.#state === "completed" || this.#state === "cancelled") return;
    this.#state = "failed";
  }
}

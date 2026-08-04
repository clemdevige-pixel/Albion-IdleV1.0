import type {
  CraftingSessionConfig,
  CraftingSessionId,
  CraftingState,
} from "./crafting-types.js";

/**
 * Represents one crafting action in progress.
 */
export class CraftingSession {
  readonly id: CraftingSessionId;
  readonly recipeId: string;
  readonly quantity: number;
  readonly config: CraftingSessionConfig;
  readonly startTick: number;

  #state: CraftingState = "idle";

  constructor(
    id: CraftingSessionId,
    recipeId: string,
    quantity: number,
    config: CraftingSessionConfig,
    startTick: number,
  ) {
    this.id = id;
    this.recipeId = recipeId;
    this.quantity = quantity;
    this.config = config;
    this.startTick = startTick;
  }

  get state(): CraftingState {
    return this.#state;
  }

  getRequiredTicks(): number {
    return Math.ceil(
      this.config.baseCraftTimeTicks * this.config.speedModifier,
    );
  }

  getProgress(currentTick: number): number {
    if (this.#state === "completed" || this.#state === "completing") return 1;
    if (this.#state !== "crafting") return 0;
    const elapsed = currentTick - this.startTick;
    const required = this.getRequiredTicks();
    return Math.min(1, elapsed / required);
  }

  isComplete(currentTick: number): boolean {
    return currentTick - this.startTick >= this.getRequiredTicks();
  }

  /** Transition from idle → validating. */
  validate(): void {
    if (this.#state !== "idle") return;
    this.#state = "validating";
  }

  /** Transition from validating → crafting. */
  start(): void {
    if (this.#state !== "validating") return;
    this.#state = "crafting";
  }

  tick(currentTick: number): void {
    if (this.#state !== "crafting") return;
    if (this.isComplete(currentTick)) {
      this.#state = "completing";
    }
  }

  complete(): void {
    if (this.#state !== "completing" && this.#state !== "crafting") return;
    this.#state = "completed";
  }

  cancel(): void {
    if (this.#state === "completed" || this.#state === "failed") return;
    this.#state = "cancelled";
  }

  fail(reason?: string): void {
    if (this.#state === "completed" || this.#state === "cancelled") return;
    void reason; // future: store reason
    this.#state = "failed";
  }
}

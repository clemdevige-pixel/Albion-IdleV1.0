import type { ResourceId } from "../resources/resource-types.js";
import type { ResourceNodeId } from "../resource-nodes/resource-node-types.js";
import type {
  GatheringSessionConfig,
  GatheringSessionId,
  GatheringState,
} from "./gathering-types.js";

/**
 * Represents one gathering action in progress.
 */
export class GatheringSession {
  readonly id: GatheringSessionId;
  readonly nodeId: ResourceNodeId;
  readonly resourceId: ResourceId;
  readonly config: GatheringSessionConfig;
  readonly startTick: number;

  #state: GatheringState = "gathering";
  #bonusProgressTicks = 0;

  constructor(
    id: GatheringSessionId,
    nodeId: ResourceNodeId,
    resourceId: ResourceId,
    config: GatheringSessionConfig,
    startTick: number,
  ) {
    this.id = id;
    this.nodeId = nodeId;
    this.resourceId = resourceId;
    this.config = config;
    this.startTick = startTick;
  }

  get state(): GatheringState {
    return this.#state;
  }

  getRequiredTicks(): number {
    return Math.ceil(
      this.config.baseGatherTimeTicks *
        this.config.toolModifier *
        this.config.masteryModifier,
    );
  }

  getElapsedTicks(currentTick: number): number {
    return Math.max(0, currentTick - this.startTick) + this.#bonusProgressTicks;
  }

  /**
   * Advances the current gathering cycle without changing its deterministic
   * reward. Used by optional active-gathering interactions.
   */
  advanceProgress(ticks: number, currentTick: number): number {
    if (this.#state !== "gathering" || !Number.isFinite(ticks) || ticks <= 0) {
      return 0;
    }

    const remainingTicks = Math.max(
      0,
      this.getRequiredTicks() - this.getElapsedTicks(currentTick),
    );
    const appliedTicks = Math.min(remainingTicks, ticks);
    this.#bonusProgressTicks += appliedTicks;
    return appliedTicks;
  }

  isComplete(currentTick: number): boolean {
    return this.getElapsedTicks(currentTick) >= this.getRequiredTicks();
  }

  tick(currentTick: number): void {
    if (this.#state !== "gathering") return;
    if (this.isComplete(currentTick)) {
      this.#state = "completed";
    }
  }

  interrupt(): void {
    if (this.#state !== "gathering") return;
    this.#state = "interrupted";
  }

  complete(): void {
    if (this.#state !== "gathering") return;
    this.#state = "completed";
  }
}

import type { WorkerId } from "../workers/index.js";
import type { WorkerTaskDefinitionId } from "../worker-tasks/index.js";
import type {
  WorkerSessionId,
  WorkerExecutionState,
  WorkerSessionConfig,
  WorkerExecutionResult,
} from "./worker-execution-types.js";

// ---------------------------------------------------------------------------
// Session
// ---------------------------------------------------------------------------

export class WorkerSession {
  readonly id: WorkerSessionId;
  readonly workerId: WorkerId;
  readonly taskDefId: WorkerTaskDefinitionId;
  readonly config: WorkerSessionConfig;

  #state: WorkerExecutionState = "idle";
  #elapsedTicks = 0;

  constructor(
    id: WorkerSessionId,
    workerId: WorkerId,
    taskDefId: WorkerTaskDefinitionId,
    config: WorkerSessionConfig,
  ) {
    this.id = id;
    this.workerId = workerId;
    this.taskDefId = taskDefId;
    this.config = config;
  }

  // -- state accessors ------------------------------------------------------

  get state(): WorkerExecutionState {
    return this.#state;
  }

  get elapsedTicks(): number {
    return this.#elapsedTicks;
  }

  get totalTicks(): number {
    return Math.max(1, Math.ceil(this.config.baseDurationTicks / this.config.speedModifier));
  }

  // -- queries --------------------------------------------------------------

  getProgress(): number {
    if (this.totalTicks === 0) return 1;
    return Math.min(1, this.#elapsedTicks / this.totalTicks);
  }

  isComplete(): boolean {
    return this.#state === "completed";
  }

  // -- transitions ----------------------------------------------------------

  start(): boolean {
    if (this.#state !== "idle") return false;
    this.#state = "executing";
    return true;
  }

  tick(): boolean {
    if (this.#state !== "executing") return false;
    this.#elapsedTicks += 1;
    if (this.#elapsedTicks >= this.totalTicks) {
      this.#state = "completed";
    }
    return true;
  }

  pause(): boolean {
    if (this.#state !== "executing") return false;
    this.#state = "paused";
    return true;
  }

  resume(): boolean {
    if (this.#state !== "paused") return false;
    this.#state = "executing";
    return true;
  }

  interrupt(reason?: string): boolean {
    if (this.#state !== "executing" && this.#state !== "paused") return false;
    void reason;
    this.#state = "interrupted";
    return true;
  }

  fail(reason?: string): boolean {
    if (this.#state === "completed" || this.#state === "failed" || this.#state === "interrupted") {
      return false;
    }
    void reason;
    this.#state = "failed";
    return true;
  }

  complete(): boolean {
    if (this.#state !== "executing") return false;
    this.#state = "completed";
    return true;
  }

  // -- result ---------------------------------------------------------------

  produceResult(): WorkerExecutionResult {
    if (this.#state !== "completed") {
      return { ok: false, reason: `Session not completed (state=${this.#state})` };
    }
    const baseYieldAmount = this.config.yieldModifier;
    return {
      ok: true,
      workerId: this.workerId,
      taskDefId: this.taskDefId,
      yield: baseYieldAmount,
      masteryGained: 1,
    };
  }
}

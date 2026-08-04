import type { RuntimeConfigInput } from "./config.js";
import { createRuntimeServices, type RuntimeServices } from "./service-container.js";
import { GameLoop } from "./game-loop.js";
import { World } from "../world/world.js";
import type { Logger } from "./logger.js";
import { createSilentLogger } from "./logger.js";
import { DiagnosticsCollector, type RuntimeDiagnostic } from "./diagnostics.js";
import { MetricsCollector, type RuntimeMetrics } from "./metrics.js";
import type { RuntimeHealth, RuntimeFailure } from "./health.js";

export type RuntimeState = "created" | "running" | "paused" | "stopped" | "disposed" | "failed";

export interface PersistenceAdapter {
  save(id: string, tick: number): void;
  load(id: string): void;
}

export interface RuntimeOrchestratorOptions {
  readonly config?: RuntimeConfigInput;
  readonly logger?: Logger;
  readonly persistence?: PersistenceAdapter | undefined;
}

export class RuntimeOrchestrator {
  readonly #configInput: RuntimeConfigInput;
  readonly logger: Logger;
  readonly #persistence: PersistenceAdapter | undefined;
  readonly #diagnostics = new DiagnosticsCollector();
  readonly #metrics = new MetricsCollector();

  #state: RuntimeState = "created";
  #services: RuntimeServices;
  #world: World;
  #loop: GameLoop;
  #failure: RuntimeFailure | undefined;

  constructor(options: RuntimeOrchestratorOptions = {}) {
    this.#configInput = options.config ?? {};
    this.logger = options.logger ?? createSilentLogger();
    this.#persistence = options.persistence;
    this.#services = createRuntimeServices(this.#configInput);
    this.#world = new World(this.#services);
    this.#loop = new GameLoop(this.#services);

    this.#listenTicks();
  }

  get services(): RuntimeServices {
    return this.#services;
  }

  get world(): World {
    return this.#world;
  }

  getState(): RuntimeState {
    return this.#state;
  }

  getCurrentTick(): number {
    return this.#services.tickEngine.currentTick;
  }

  getEntityCount(): number {
    return this.#world.getEntityCount();
  }

  getHealth(): RuntimeHealth {
    if (this.#state === "failed" && this.#failure !== undefined) {
      return { status: "failed", error: this.#failure };
    }
    const issues = this.#diagnostics.getAll();
    if (issues.length > 0) {
      return { status: "degraded", issues };
    }
    return { status: "healthy" };
  }

  getMetrics(): RuntimeMetrics {
    this.#metrics.record("entityCount", this.#world.getEntityCount());
    this.#metrics.record("scheduledTasks", this.#services.scheduler.pendingCount);
    this.#metrics.record("diagnosticCount", this.#diagnostics.getAll().length);
    return this.#metrics.get();
  }

  getDiagnostics(): readonly RuntimeDiagnostic[] {
    return this.#diagnostics.getAll();
  }

  start(): void {
    this.#requireState("start", "created", "stopped");
    this.#loop.start();
    this.#state = "running";
    this.logger.info("Runtime started");
  }

  stop(): void {
    this.#requireState("stop", "running", "paused");
    this.#loop.stop();
    this.#state = "stopped";
    this.logger.info("Runtime stopped");
  }

  pause(): void {
    this.#requireState("pause", "running");
    this.#loop.pause();
    this.#state = "paused";
    this.logger.info("Runtime paused");
  }

  resume(): void {
    this.#requireState("resume", "paused");
    this.#loop.resume();
    this.#state = "running";
    this.logger.info("Runtime resumed");
  }

  step(): void {
    this.#requireState("step", "paused");
    this.#executeTick();
  }

  tick(): void {
    if (this.#state !== "running") {
      return;
    }
    this.#executeTick();
  }

  reset(): void {
    this.#requireNotDisposed("reset");
    this.#loop.stop();
    this.#services = createRuntimeServices(this.#configInput);
    this.#world = new World(this.#services);
    this.#loop = new GameLoop(this.#services);
    this.#diagnostics.clear();
    this.#metrics.reset();
    this.#failure = undefined;
    this.#state = "created";
    this.#listenTicks();
    this.logger.info("Runtime reset");
  }

  dispose(): void {
    if (this.#state === "disposed") {
      return;
    }
    this.#loop.stop();
    this.#services.eventBus.clear();
    this.#services.scheduler.clear();
    this.#world.clear();
    this.#state = "disposed";
    this.logger.info("Runtime disposed");
  }

  save(id: string): void {
    this.#requireNotDisposed("save");
    if (this.#persistence === undefined) {
      throw new Error("No persistence adapter configured");
    }
    this.#persistence.save(id, this.getCurrentTick());
    this.#metrics.increment("saveCount");
    this.logger.info("Save created", { id });
  }

  load(id: string): void {
    this.#requireNotDisposed("load");
    if (this.#persistence === undefined) {
      throw new Error("No persistence adapter configured");
    }

    const wasPaused = this.#state === "paused";
    const wasRunning = this.#state === "running";
    if (wasRunning) {
      this.#loop.stop();
    }

    try {
      this.#persistence.load(id);
      this.logger.info("Save loaded", { id });
    } catch (err) {
      if (wasRunning) {
        this.#loop.start();
      }
      throw err;
    }

    if (wasRunning) {
      this.#loop.start();
    }
    if (wasPaused) {
      this.#state = "paused";
    }
  }

  #executeTick(): void {
    try {
      const { tickEngine, clock, scheduler, eventBus } = this.#services;
      const tick = tickEngine.advance();
      const deltaTime = 1000 / this.#services.config.tickRate;
      clock.advance(deltaTime, tick);
      scheduler.runDueTasks(tick);
      this.#world.update();
      eventBus.publish("TickAdvanced", { tick, deltaTime });
      this.#metrics.increment("ticksExecuted");
    } catch (err) {
      const tick = this.#services.tickEngine.currentTick;
      const failure: RuntimeFailure = {
        message: err instanceof Error ? err.message : String(err),
        tick,
        cause: err instanceof Error ? err : undefined,
      };
      this.#failure = failure;
      this.#state = "failed";
      this.#loop.stop();
      this.#metrics.increment("errorCount");
      this.#diagnostics.add({
        severity: "fatal",
        code: "SYSTEM_ERROR",
        message: failure.message,
        tick,
      });
      this.logger.error("Runtime failed", { tick }, failure.cause);
    }
  }

  #listenTicks(): void {
    this.#services.eventBus.subscribe("TickAdvanced", () => {
      this.#metrics.record("ticksExecuted", this.#services.tickEngine.currentTick);
    });
  }

  #requireState(action: string, ...allowed: RuntimeState[]): void {
    this.#requireNotDisposed(action);
    if (!allowed.includes(this.#state)) {
      throw new Error(
        `Cannot ${action} in state "${this.#state}". Allowed: ${allowed.join(", ")}`,
      );
    }
  }

  #requireNotDisposed(action: string): void {
    if (this.#state === "disposed") {
      throw new Error(`Cannot ${action}: runtime is disposed`);
    }
  }
}

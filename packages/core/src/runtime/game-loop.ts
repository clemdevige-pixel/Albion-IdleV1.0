import { fixedDeltaMs } from "./config.js";
import type { RuntimeServices } from "./service-container.js";

/**
 * Fixed-timestep simulation loop.
 *
 * Deterministic and framerate-independent: each step advances the simulation by
 * exactly one tick worth of fixed simulation time. There is no dependency on
 * `requestAnimationFrame` or timers — a host drives progress by calling
 * {@link tick} (one step) or {@link advance} (accumulate real time into whole
 * steps). This makes the loop fully usable from tests.
 */
export class GameLoop {
  readonly #services: RuntimeServices;
  readonly #fixedDelta: number;
  readonly #speed: number;
  readonly #maxStepsPerAdvance: number;

  #running = false;
  #paused = false;
  #accumulatorMs = 0;

  constructor(services: RuntimeServices, options: { maxStepsPerAdvance?: number } = {}) {
    this.#services = services;
    this.#fixedDelta = fixedDeltaMs(services.config);
    this.#speed = services.config.simulationSpeed;
    this.#maxStepsPerAdvance = options.maxStepsPerAdvance ?? 1000;
  }

  get isRunning(): boolean {
    return this.#running;
  }

  get isPaused(): boolean {
    return this.#paused;
  }

  /** Marks the loop running and emits `SimulationStarted`. Idempotent. */
  start(): void {
    if (this.#running) {
      return;
    }
    this.#running = true;
    this.#paused = false;
    this.#accumulatorMs = 0;
    this.#services.eventBus.publish("SimulationStarted", {
      tick: this.#services.tickEngine.currentTick,
    });
  }

  /** Stops the loop and emits `SimulationStopped`. Idempotent. */
  stop(): void {
    if (!this.#running) {
      return;
    }
    this.#running = false;
    this.#paused = false;
    this.#services.eventBus.publish("SimulationStopped", {
      tick: this.#services.tickEngine.currentTick,
    });
  }

  /** Pauses stepping without stopping. Emits `SimulationPaused`. */
  pause(): void {
    if (!this.#running || this.#paused) {
      return;
    }
    this.#paused = true;
    this.#services.eventBus.publish("SimulationPaused", {
      tick: this.#services.tickEngine.currentTick,
    });
  }

  /** Resumes stepping after a pause. Emits `SimulationResumed`. */
  resume(): void {
    if (!this.#running || !this.#paused) {
      return;
    }
    this.#paused = false;
    this.#services.eventBus.publish("SimulationResumed", {
      tick: this.#services.tickEngine.currentTick,
    });
  }

  /**
   * Advances exactly one fixed step when running and not paused.
   * Returns `true` if a step was performed.
   */
  tick(): boolean {
    if (!this.#running || this.#paused) {
      return false;
    }
    this.#step();
    return true;
  }

  /**
   * Feeds real elapsed time (ms) into the loop, running as many whole fixed
   * steps as the accumulated, speed-scaled time allows. Returns the number of
   * steps performed. No-op unless running and not paused.
   */
  advance(realDeltaMs: number): number {
    if (!this.#running || this.#paused) {
      return 0;
    }
    this.#accumulatorMs += realDeltaMs * this.#speed;
    let steps = 0;
    while (this.#accumulatorMs >= this.#fixedDelta && steps < this.#maxStepsPerAdvance) {
      this.#step();
      this.#accumulatorMs -= this.#fixedDelta;
      steps += 1;
    }
    return steps;
  }

  #step(): void {
    const { tickEngine, clock, scheduler, eventBus } = this.#services;
    const tick = tickEngine.advance();
    clock.advance(this.#fixedDelta, tick);
    scheduler.runDueTasks(tick);
    eventBus.publish("TickAdvanced", { tick, deltaTime: this.#fixedDelta });
  }
}

import { createMonotonicIdFactory, type Brand, type IdFactory } from "./ids.js";

/** Opaque handle to a scheduled task. */
export type TaskId = Brand<number, "TaskId">;

export type ScheduledTask = () => void;

interface TaskRecord {
  readonly id: TaskId;
  /** Next tick (inclusive) at which the task should run. */
  targetTick: number;
  /** When set, the task reschedules itself this many ticks later. */
  readonly intervalTicks: number | null;
  readonly run: ScheduledTask;
}

/**
 * Deterministic, tick-based scheduler.
 *
 * Tasks fire when the simulation reaches their target tick — never via
 * `setTimeout`/`setInterval`. Due tasks run in a stable order: earliest target
 * tick first, ties broken by ascending task id (creation order).
 */
export class Scheduler {
  readonly #tasks = new Map<TaskId, TaskRecord>();
  readonly #ids: IdFactory<TaskId>;

  constructor(ids: IdFactory<TaskId> = createMonotonicIdFactory<TaskId>()) {
    this.#ids = ids;
  }

  /** Schedules `task` to run once when the simulation reaches `tick`. */
  scheduleAt(tick: number, task: ScheduledTask): TaskId {
    return this.#add(tick, null, task);
  }

  /** Schedules `task` to run every `intervalTicks`, first at `startTick`. */
  scheduleEvery(intervalTicks: number, task: ScheduledTask, startTick: number): TaskId {
    if (!Number.isInteger(intervalTicks) || intervalTicks <= 0) {
      throw new RangeError(`intervalTicks must be a positive integer, got ${intervalTicks}`);
    }
    return this.#add(startTick, intervalTicks, task);
  }

  /** Cancels a scheduled task. Returns `true` if it existed. */
  cancel(id: TaskId): boolean {
    return this.#tasks.delete(id);
  }

  /** Number of pending tasks. */
  get pendingCount(): number {
    return this.#tasks.size;
  }

  /** Removes all pending tasks. */
  clear(): void {
    this.#tasks.clear();
  }

  /**
   * Runs every task whose target tick is `<= currentTick`, in deterministic
   * order. Repeating tasks are rescheduled; one-shot tasks are removed.
   */
  runDueTasks(currentTick: number): void {
    const due = [...this.#tasks.values()]
      .filter((task) => task.targetTick <= currentTick)
      .sort((a, b) => a.targetTick - b.targetTick || a.id - b.id);

    for (const task of due) {
      task.run();
      if (task.intervalTicks === null) {
        this.#tasks.delete(task.id);
      } else {
        task.targetTick += task.intervalTicks;
      }
    }
  }

  #add(targetTick: number, intervalTicks: number | null, run: ScheduledTask): TaskId {
    const id = this.#ids.next();
    this.#tasks.set(id, { id, targetTick, intervalTicks, run });
    return id;
  }
}

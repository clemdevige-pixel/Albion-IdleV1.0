import type { EventBus } from "@game/core";
import type { WorkerScheduler } from "../worker-execution/index.js";
import type { AutomationEventMap } from "./automation-events.js";
import type {
  AutomationConfig,
  AutomationInstance,
  AutomationQueueEntry,
} from "./automation-types.js";
import {
  type AutomationId,
  nextAutomationId,
} from "./automation-types.js";
import { AutomationQueue } from "./automation-queue.js";
import { resolveNextTask } from "./automation-resolver.js";
import type { AutomationRule } from "./automation-rules.js";

export type CreateAutomationResult =
  | { readonly ok: true; readonly automationId: AutomationId }
  | { readonly ok: false; readonly reason: string };

export class AutomationManager {
  readonly #automations = new Map<AutomationId, AutomationInstance>();
  readonly #queues = new Map<AutomationId, AutomationQueue>();
  readonly #originalEntries = new Map<AutomationId, readonly AutomationQueueEntry[]>();
  readonly #scheduler: WorkerScheduler;
  readonly #events: EventBus<AutomationEventMap>;
  readonly #rules: readonly AutomationRule[];

  constructor(
    scheduler: WorkerScheduler,
    events: EventBus<AutomationEventMap>,
    rules: readonly AutomationRule[] = [],
  ) {
    this.#scheduler = scheduler;
    this.#events = events;
    this.#rules = rules;
  }

  createAutomation(config: AutomationConfig): CreateAutomationResult {
    if (config.queue.length === 0) {
      return { ok: false, reason: "empty_queue" };
    }
    const id = nextAutomationId();
    const instance: AutomationInstance = {
      id,
      workerId: config.workerId,
      loopMode: config.loopMode,
      state: "idle",
      currentIndex: 0,
      remainingRepeats: config.queue[0]!.repeatCount,
    };
    this.#automations.set(id, instance);
    this.#queues.set(id, new AutomationQueue(config.queue));
    this.#originalEntries.set(id, config.queue);
    this.#events.publish("automation:created", {
      automationId: id,
      workerId: config.workerId,
    });
    return { ok: true, automationId: id };
  }

  startAutomation(id: AutomationId): boolean {
    const auto = this.#automations.get(id);
    if (!auto) return false;
    if (auto.state !== "idle" && auto.state !== "paused") return false;
    auto.state = "running";
    this.#events.publish("automation:started", { automationId: id });
    return true;
  }

  pauseAutomation(id: AutomationId): boolean {
    const auto = this.#automations.get(id);
    if (!auto) return false;
    if (auto.state !== "running") return false;
    auto.state = "paused";
    this.#events.publish("automation:paused", { automationId: id });
    return true;
  }

  stopAutomation(id: AutomationId): boolean {
    const auto = this.#automations.get(id);
    if (!auto) return false;
    if (auto.state === "stopped") return false;
    auto.state = "stopped";
    this.#events.publish("automation:stopped", { automationId: id });
    return true;
  }

  tickAutomation(id: AutomationId): boolean {
    const auto = this.#automations.get(id);
    if (!auto || auto.state !== "running") return false;

    const queue = this.#queues.get(id);
    if (!queue) return false;
    const session = this.#scheduler.getSession(auto.workerId);

    if (session && session.state === "executing") {
      return true;
    }

    if (session && session.isComplete()) {
      this.#scheduler.removeSession(auto.workerId);
      queue.advance();
    }

    const resolved = resolveNextTask(queue, this.#rules, auto.workerId);
    if (!resolved.ok) {
      if (auto.loopMode && resolved.reason === "queue_empty") {
        const original = this.#originalEntries.get(id);
        if (original && original.length > 0) {
          queue.reset(original);
          const retryResolved = resolveNextTask(queue, this.#rules, auto.workerId);
          if (!retryResolved.ok) {
            this.#events.publish("automation:queueEmpty", { automationId: id });
            return false;
          }
          this.#events.publish("automation:taskAdvanced", {
            automationId: id,
            taskDefId: retryResolved.taskDefId,
            index: 0,
          });
          return true;
        }
      }
      this.#events.publish("automation:queueEmpty", { automationId: id });
      return false;
    }

    this.#events.publish("automation:taskAdvanced", {
      automationId: id,
      taskDefId: resolved.taskDefId,
      index: auto.currentIndex,
    });
    return true;
  }

  getAutomation(id: AutomationId): AutomationInstance | undefined {
    return this.#automations.get(id);
  }

  getAllAutomations(): readonly AutomationInstance[] {
    return [...this.#automations.values()];
  }

  getQueue(id: AutomationId): AutomationQueue | undefined {
    return this.#queues.get(id);
  }
}

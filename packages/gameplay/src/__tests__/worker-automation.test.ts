import { describe, it, expect, beforeEach } from "vitest";
import { EventBus } from "@game/core";
import { AutomationQueue } from "../worker-automation/automation-queue.js";
import {
  AutomationManager,
  _resetAutomationCounter,
  type AutomationEventMap,
  type AutomationQueueEntry,
  SimpleAutomationRule,
  resolveNextTask,
} from "../worker-automation/index.js";
import { WorkerScheduler, type WorkerExecutionEventMap } from "../worker-execution/index.js";
import { asWorkerTaskDefinitionId } from "../worker-tasks/index.js";
import { asWorkerId } from "../workers/index.js";

const taskA = asWorkerTaskDefinitionId("task_a");
const taskB = asWorkerTaskDefinitionId("task_b");
const worker1 = asWorkerId("worker_1");

describe("AutomationQueue", () => {
  it("tracks entries and returns next", () => {
    const q = new AutomationQueue([{ taskDefId: taskA, repeatCount: 2 }]);
    expect(q.isEmpty()).toBe(false);
    expect(q.size()).toBe(1);
    expect(q.getNext()).toBe(taskA);
  });

  it("advance decrements repeat count", () => {
    const q = new AutomationQueue([{ taskDefId: taskA, repeatCount: 2 }]);
    q.advance();
    expect(q.size()).toBe(1);
    q.advance();
    expect(q.isEmpty()).toBe(true);
  });

  it("infinite repeat (-1) never removes entry", () => {
    const q = new AutomationQueue([{ taskDefId: taskA, repeatCount: -1 }]);
    q.advance();
    q.advance();
    q.advance();
    expect(q.isEmpty()).toBe(false);
    expect(q.getNext()).toBe(taskA);
  });

  it("handles multiple entries sequentially", () => {
    const q = new AutomationQueue([
      { taskDefId: taskA, repeatCount: 1 },
      { taskDefId: taskB, repeatCount: 1 },
    ]);
    expect(q.getNext()).toBe(taskA);
    q.advance();
    expect(q.getNext()).toBe(taskB);
    q.advance();
    expect(q.isEmpty()).toBe(true);
  });

  it("addTask appends to queue", () => {
    const q = new AutomationQueue([]);
    expect(q.isEmpty()).toBe(true);
    q.addTask({ taskDefId: taskA, repeatCount: 1 });
    expect(q.size()).toBe(1);
    expect(q.getNext()).toBe(taskA);
  });

  it("removeTask removes by index", () => {
    const q = new AutomationQueue([
      { taskDefId: taskA, repeatCount: 1 },
      { taskDefId: taskB, repeatCount: 1 },
    ]);
    expect(q.removeTask(0)).toBe(true);
    expect(q.getNext()).toBe(taskB);
    expect(q.removeTask(5)).toBe(false);
  });

  it("reset restores queue from entries", () => {
    const entries: AutomationQueueEntry[] = [{ taskDefId: taskA, repeatCount: 1 }];
    const q = new AutomationQueue(entries);
    q.advance();
    expect(q.isEmpty()).toBe(true);
    q.reset(entries);
    expect(q.isEmpty()).toBe(false);
    expect(q.getNext()).toBe(taskA);
  });
});

describe("resolveNextTask", () => {
  it("returns next task when queue has entries and rules pass", () => {
    const q = new AutomationQueue([{ taskDefId: taskA, repeatCount: 1 }]);
    const result = resolveNextTask(q, [new SimpleAutomationRule()], worker1);
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.taskDefId).toBe(taskA);
  });

  it("returns queue_empty when queue is empty", () => {
    const q = new AutomationQueue([]);
    const result = resolveNextTask(q, [], worker1);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toBe("queue_empty");
  });

  it("returns rule_blocked when a rule rejects", () => {
    const q = new AutomationQueue([{ taskDefId: taskA, repeatCount: 1 }]);
    const blockingRule = { canExecute: () => false };
    const result = resolveNextTask(q, [blockingRule], worker1);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toBe("rule_blocked");
  });
});

describe("AutomationManager", () => {
  let execEvents: EventBus<WorkerExecutionEventMap>;
  let autoEvents: EventBus<AutomationEventMap>;
  let scheduler: WorkerScheduler;
  let manager: AutomationManager;

  beforeEach(() => {
    _resetAutomationCounter();
    execEvents = new EventBus<WorkerExecutionEventMap>();
    autoEvents = new EventBus<AutomationEventMap>();
    scheduler = new WorkerScheduler(execEvents);
    manager = new AutomationManager(scheduler, autoEvents);
  });

  it("creates automation and emits event", () => {
    const events: unknown[] = [];
    autoEvents.subscribe("automation:created", (e) => events.push(e));
    const result = manager.createAutomation({
      workerId: worker1,
      queue: [{ taskDefId: taskA, repeatCount: 1 }],
      loopMode: false,
    });
    expect(result.ok).toBe(true);
    expect(events).toHaveLength(1);
  });

  it("rejects empty queue", () => {
    const result = manager.createAutomation({
      workerId: worker1,
      queue: [],
      loopMode: false,
    });
    expect(result.ok).toBe(false);
  });

  it("start/pause/stop transitions", () => {
    const result = manager.createAutomation({
      workerId: worker1,
      queue: [{ taskDefId: taskA, repeatCount: 1 }],
      loopMode: false,
    });
    if (!result.ok) throw new Error("should create");
    const id = result.automationId;

    expect(manager.startAutomation(id)).toBe(true);
    expect(manager.getAutomation(id)!.state).toBe("running");

    expect(manager.pauseAutomation(id)).toBe(true);
    expect(manager.getAutomation(id)!.state).toBe("paused");

    expect(manager.startAutomation(id)).toBe(true);
    expect(manager.getAutomation(id)!.state).toBe("running");

    expect(manager.stopAutomation(id)).toBe(true);
    expect(manager.getAutomation(id)!.state).toBe("stopped");
  });

  it("tickAutomation emits taskAdvanced", () => {
    const events: unknown[] = [];
    autoEvents.subscribe("automation:taskAdvanced", (e) => events.push(e));

    const result = manager.createAutomation({
      workerId: worker1,
      queue: [{ taskDefId: taskA, repeatCount: 1 }],
      loopMode: false,
    });
    if (!result.ok) throw new Error("should create");
    manager.startAutomation(result.automationId);
    manager.tickAutomation(result.automationId);
    expect(events).toHaveLength(1);
  });

  it("emits queueEmpty when queue exhausted", () => {
    const events: unknown[] = [];
    autoEvents.subscribe("automation:queueEmpty", (e) => events.push(e));

    const result = manager.createAutomation({
      workerId: worker1,
      queue: [{ taskDefId: taskA, repeatCount: 1 }],
      loopMode: false,
    });
    if (!result.ok) throw new Error("should create");
    manager.startAutomation(result.automationId);

    manager.tickAutomation(result.automationId);
    const queue = manager.getQueue(result.automationId)!;
    queue.advance();
    manager.tickAutomation(result.automationId);
    expect(events.length).toBeGreaterThanOrEqual(1);
  });

  it("loop mode resets queue when exhausted", () => {
    const advancedEvents: unknown[] = [];
    autoEvents.subscribe("automation:taskAdvanced", (e) => advancedEvents.push(e));

    const result = manager.createAutomation({
      workerId: worker1,
      queue: [{ taskDefId: taskA, repeatCount: 1 }],
      loopMode: true,
    });
    if (!result.ok) throw new Error("should create");
    manager.startAutomation(result.automationId);

    manager.tickAutomation(result.automationId);
    const queue = manager.getQueue(result.automationId)!;
    queue.advance();
    manager.tickAutomation(result.automationId);
    expect(advancedEvents.length).toBeGreaterThanOrEqual(2);
  });

  it("getAllAutomations returns all", () => {
    manager.createAutomation({
      workerId: worker1,
      queue: [{ taskDefId: taskA, repeatCount: 1 }],
      loopMode: false,
    });
    expect(manager.getAllAutomations()).toHaveLength(1);
  });
});

import { describe, it, expect, beforeEach } from "vitest";
import { EventBus } from "@game/core";
import { WorkerRegistry } from "../workers/worker-registry.js";
import { WorkerManager, _resetWorkerCounter } from "../workers/worker-manager.js";
import { asWorkerId, asWorkerDefinitionId } from "../workers/worker-types.js";
import type { WorkerDefinition } from "../workers/worker-types.js";
import { WorkerTaskRegistry } from "../worker-tasks/worker-task-registry.js";
import { WorkerAssignmentManager } from "../worker-tasks/worker-assignment-manager.js";
import { asWorkerTaskDefinitionId } from "../worker-tasks/worker-task-types.js";
import type { WorkerTaskDefinition } from "../worker-tasks/worker-task-types.js";
import { WorkerSession } from "../worker-execution/worker-session.js";
import { WorkerExecutor, _resetSessionCounter } from "../worker-execution/worker-executor.js";
import { WorkerScheduler } from "../worker-execution/worker-scheduler.js";
import { WorkerTaskPipeline } from "../worker-execution/worker-task-pipeline.js";
import { asWorkerSessionId } from "../worker-execution/worker-execution-types.js";
import type { WorkerExecutionEventMap } from "../worker-execution/worker-execution-events.js";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const WOOD_DEF_ID = asWorkerDefinitionId("woodcutter-def");
const WOOD_TASK_ID = asWorkerTaskDefinitionId("gather-wood-t1");
const STONE_TASK_ID = asWorkerTaskDefinitionId("gather-stone-t1");

function makeWorkerDef(): WorkerDefinition {
  return {
    id: WOOD_DEF_ID,
    displayName: "Woodcutter",
    profession: "woodcutter",
    baseMasteryGainRate: 1,
    tags: [],
  };
}

function makeTaskDef(id = WOOD_TASK_ID): WorkerTaskDefinition {
  return {
    id,
    displayName: "Gather Wood T1",
    category: "gathering",
    requiredProfession: "woodcutter",
    durationTicks: 5,
    baseYield: 10,
    resourceTier: 1,
    tags: [],
  };
}

// ---------------------------------------------------------------------------
// WorkerSession
// ---------------------------------------------------------------------------

describe("WorkerSession", () => {
  function makeSession(durationTicks = 5) {
    return new WorkerSession(
      asWorkerSessionId("s-1"),
      asWorkerId("worker-1"),
      WOOD_TASK_ID,
      { baseDurationTicks: durationTicks, speedModifier: 1, yieldModifier: 10 },
    );
  }

  it("starts in idle state", () => {
    const s = makeSession();
    expect(s.state).toBe("idle");
    expect(s.getProgress()).toBe(0);
    expect(s.isComplete()).toBe(false);
  });

  it("transitions idle -> executing -> completed", () => {
    const s = makeSession(3);
    expect(s.start()).toBe(true);
    expect(s.state).toBe("executing");

    s.tick();
    s.tick();
    expect(s.state).toBe("executing");
    expect(s.isComplete()).toBe(false);

    s.tick();
    expect(s.state).toBe("completed");
    expect(s.isComplete()).toBe(true);
    expect(s.getProgress()).toBe(1);
  });

  it("pause and resume", () => {
    const s = makeSession();
    s.start();
    s.tick();

    expect(s.pause()).toBe(true);
    expect(s.state).toBe("paused");
    // tick should not advance while paused
    expect(s.tick()).toBe(false);

    expect(s.resume()).toBe(true);
    expect(s.state).toBe("executing");
    expect(s.tick()).toBe(true);
  });

  it("interrupt from executing", () => {
    const s = makeSession();
    s.start();
    expect(s.interrupt("test")).toBe(true);
    expect(s.state).toBe("interrupted");
    // cannot resume after interrupt
    expect(s.resume()).toBe(false);
  });

  it("interrupt from paused", () => {
    const s = makeSession();
    s.start();
    s.pause();
    expect(s.interrupt("test")).toBe(true);
    expect(s.state).toBe("interrupted");
  });

  it("fail from executing", () => {
    const s = makeSession();
    s.start();
    expect(s.fail("boom")).toBe(true);
    expect(s.state).toBe("failed");
  });

  it("fail from idle", () => {
    const s = makeSession();
    expect(s.fail("boom")).toBe(true);
    expect(s.state).toBe("failed");
  });

  it("cannot fail from completed", () => {
    const s = makeSession(1);
    s.start();
    s.tick();
    expect(s.state).toBe("completed");
    expect(s.fail("boom")).toBe(false);
  });

  it("produce result only when completed", () => {
    const s = makeSession(1);
    // not completed yet
    const r1 = s.produceResult();
    expect(r1.ok).toBe(false);

    s.start();
    s.tick();
    const r2 = s.produceResult();
    expect(r2.ok).toBe(true);
    if (r2.ok) {
      expect(r2.yield).toBe(10);
      expect(r2.masteryGained).toBe(1);
    }
  });

  it("tick progression reports correct progress", () => {
    const s = makeSession(4);
    s.start();
    s.tick();
    expect(s.getProgress()).toBeCloseTo(0.25);
    s.tick();
    expect(s.getProgress()).toBeCloseTo(0.5);
  });
});

// ---------------------------------------------------------------------------
// WorkerExecutor
// ---------------------------------------------------------------------------

describe("WorkerExecutor", () => {
  let workerRegistry: WorkerRegistry;
  let workerManager: WorkerManager;
  let taskRegistry: WorkerTaskRegistry;
  let assignmentManager: WorkerAssignmentManager;
  let events: EventBus<WorkerExecutionEventMap>;
  let executor: WorkerExecutor;

  beforeEach(() => {
    _resetWorkerCounter();
    _resetSessionCounter();
    workerRegistry = new WorkerRegistry();
    workerRegistry.register(makeWorkerDef());
    workerManager = new WorkerManager(workerRegistry);
    taskRegistry = new WorkerTaskRegistry();
    taskRegistry.register(makeTaskDef());
    assignmentManager = new WorkerAssignmentManager(workerManager, taskRegistry);
    events = new EventBus<WorkerExecutionEventMap>();
    executor = new WorkerExecutor(workerManager, assignmentManager, taskRegistry, events);
  });

  it("starts execution for assigned worker", () => {
    const w = workerManager.createWorker(WOOD_DEF_ID);
    if (!w.ok) throw new Error("fail");
    assignmentManager.assign(w.worker.id, WOOD_TASK_ID);

    const result = executor.startExecution(w.worker.id, WOOD_TASK_ID);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.session.state).toBe("executing");
    }
  });

  it("fails if worker not found", () => {
    const result = executor.startExecution(asWorkerId("nope"), WOOD_TASK_ID);
    expect(result.ok).toBe(false);
  });

  it("fails if no assignment", () => {
    const w = workerManager.createWorker(WOOD_DEF_ID);
    if (!w.ok) throw new Error("fail");
    const result = executor.startExecution(w.worker.id, WOOD_TASK_ID);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.reason).toContain("No assignment");
    }
  });

  it("fails if assignment mismatch", () => {
    const w = workerManager.createWorker(WOOD_DEF_ID);
    if (!w.ok) throw new Error("fail");
    assignmentManager.assign(w.worker.id, WOOD_TASK_ID);

    const result = executor.startExecution(w.worker.id, STONE_TASK_ID);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.reason).toContain("mismatch");
    }
  });

  it("emits workerExec:started event", () => {
    const w = workerManager.createWorker(WOOD_DEF_ID);
    if (!w.ok) throw new Error("fail");
    assignmentManager.assign(w.worker.id, WOOD_TASK_ID);

    const fired: unknown[] = [];
    events.subscribe("workerExec:started", (e) => fired.push(e));

    executor.startExecution(w.worker.id, WOOD_TASK_ID);
    expect(fired).toHaveLength(1);
  });
});

// ---------------------------------------------------------------------------
// WorkerScheduler
// ---------------------------------------------------------------------------

describe("WorkerScheduler", () => {
  let events: EventBus<WorkerExecutionEventMap>;
  let scheduler: WorkerScheduler;

  beforeEach(() => {
    events = new EventBus<WorkerExecutionEventMap>();
    scheduler = new WorkerScheduler(events);
  });

  function addSession(id: string, workerId: string, ticks: number) {
    const session = new WorkerSession(
      asWorkerSessionId(id),
      asWorkerId(workerId),
      WOOD_TASK_ID,
      { baseDurationTicks: ticks, speedModifier: 1, yieldModifier: 10 },
    );
    session.start();
    scheduler.addSession(session);
    return session;
  }

  it("manages multiple sessions", () => {
    addSession("s1", "w1", 5);
    addSession("s2", "w2", 5);
    expect(scheduler.getActiveSessions()).toHaveLength(2);
  });

  it("tickAll advances all active sessions", () => {
    const s1 = addSession("s1", "w1", 2);
    const s2 = addSession("s2", "w2", 3);

    scheduler.tickAll();
    expect(s1.elapsedTicks).toBe(1);
    expect(s2.elapsedTicks).toBe(1);

    scheduler.tickAll();
    expect(s1.isComplete()).toBe(true);
    expect(s2.isComplete()).toBe(false);

    // completed sessions are not ticked further
    scheduler.tickAll();
    expect(s2.isComplete()).toBe(true);
  });

  it("getSession retrieves by workerId", () => {
    const s = addSession("s1", "w1", 5);
    expect(scheduler.getSession(asWorkerId("w1"))).toBe(s);
    expect(scheduler.getSession(asWorkerId("w99"))).toBeUndefined();
  });

  it("emits tick and completed events", () => {
    addSession("s1", "w1", 1);
    const ticks: unknown[] = [];
    const completions: unknown[] = [];
    events.subscribe("workerExec:tick", (e) => ticks.push(e));
    events.subscribe("workerExec:completed", (e) => completions.push(e));

    scheduler.tickAll();
    expect(ticks).toHaveLength(1);
    expect(completions).toHaveLength(1);
  });

  it("removeSession removes a session", () => {
    addSession("s1", "w1", 5);
    expect(scheduler.removeSession(asWorkerId("w1"))).toBe(true);
    expect(scheduler.getSession(asWorkerId("w1"))).toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
// WorkerTaskPipeline
// ---------------------------------------------------------------------------

describe("WorkerTaskPipeline", () => {
  let workerRegistry: WorkerRegistry;
  let workerManager: WorkerManager;
  let taskRegistry: WorkerTaskRegistry;
  let assignmentManager: WorkerAssignmentManager;
  let events: EventBus<WorkerExecutionEventMap>;
  let pipeline: WorkerTaskPipeline;

  beforeEach(() => {
    _resetWorkerCounter();
    _resetSessionCounter();
    workerRegistry = new WorkerRegistry();
    workerRegistry.register(makeWorkerDef());
    workerManager = new WorkerManager(workerRegistry);
    taskRegistry = new WorkerTaskRegistry();
    taskRegistry.register(makeTaskDef());
    assignmentManager = new WorkerAssignmentManager(workerManager, taskRegistry);
    events = new EventBus<WorkerExecutionEventMap>();
    pipeline = new WorkerTaskPipeline(workerManager, assignmentManager, taskRegistry, events);
  });

  it("full pipeline: start -> tick to completion -> produce result", () => {
    const w = workerManager.createWorker(WOOD_DEF_ID);
    if (!w.ok) throw new Error("fail");
    assignmentManager.assign(w.worker.id, WOOD_TASK_ID);

    const startResult = pipeline.start(w.worker.id, WOOD_TASK_ID);
    expect(startResult.ok).toBe(true);
    if (!startResult.ok) return;

    const session = startResult.session;
    // task has durationTicks=5
    for (let i = 0; i < 5; i++) {
      pipeline.tick(session);
    }

    expect(session.isComplete()).toBe(true);
    const result = pipeline.complete(session);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.yield).toBe(10);
    }
  });

  it("emits tick events during pipeline", () => {
    const w = workerManager.createWorker(WOOD_DEF_ID);
    if (!w.ok) throw new Error("fail");
    assignmentManager.assign(w.worker.id, WOOD_TASK_ID);

    const ticks: unknown[] = [];
    events.subscribe("workerExec:tick", (e) => ticks.push(e));

    const r = pipeline.start(w.worker.id, WOOD_TASK_ID);
    if (!r.ok) return;
    pipeline.tick(r.session);
    pipeline.tick(r.session);

    expect(ticks).toHaveLength(2);
  });
});

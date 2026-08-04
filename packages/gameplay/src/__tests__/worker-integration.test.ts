import { describe, expect, it } from "vitest";
import { EventBus } from "@game/core";
import { WorkerRegistry, WorkerManager, _resetWorkerCounter, asWorkerId } from "../workers/index.js";
import { asWorkerDefinitionId } from "../workers/index.js";
import type { WorkerDefinition } from "../workers/index.js";
import {
  WorkerTaskRegistry,
  WorkerAssignmentManager,
  asWorkerTaskDefinitionId,
} from "../worker-tasks/index.js";
import type { WorkerTaskDefinition } from "../worker-tasks/index.js";
import type { WorkerExecutionEventMap } from "../worker-execution/index.js";
import { WorkerExecutor, WorkerScheduler, _resetSessionCounter } from "../worker-execution/index.js";
import { WorkerCoordinator } from "../worker-integration/worker-coordinator.js";
import type { WorkerIntegrationEventMap } from "../worker-integration/worker-integration-events.js";
import { serializeWorkerState, deserializeWorkerState } from "../worker-integration/worker-save-state.js";

// ── Test data ───────────────────────────────────────────────────────

const WOODCUTTER_DEF_ID = asWorkerDefinitionId("def_woodcutter");
const MINER_DEF_ID = asWorkerDefinitionId("def_miner");

const WOODCUTTER_DEF: WorkerDefinition = {
  id: WOODCUTTER_DEF_ID,
  displayName: "Woodcutter",
  profession: "woodcutter",
  baseMasteryGainRate: 1,
  tags: [],
};

const MINER_DEF: WorkerDefinition = {
  id: MINER_DEF_ID,
  displayName: "Miner",
  profession: "miner",
  baseMasteryGainRate: 1,
  tags: [],
};

const CHOP_TASK_ID = asWorkerTaskDefinitionId("task_chop");
const MINE_TASK_ID = asWorkerTaskDefinitionId("task_mine");

const CHOP_TASK: WorkerTaskDefinition = {
  id: CHOP_TASK_ID,
  displayName: "Chop Wood",
  category: "gathering",
  requiredProfession: "woodcutter",
  durationTicks: 3,
  baseYield: 10,
  resourceTier: 1,
  tags: [],
};

const MINE_TASK: WorkerTaskDefinition = {
  id: MINE_TASK_ID,
  displayName: "Mine Ore",
  category: "gathering",
  requiredProfession: "miner",
  durationTicks: 2,
  baseYield: 8,
  resourceTier: 1,
  tags: [],
};

// ── Helpers ─────────────────────────────────────────────────────────

function setup() {
  _resetWorkerCounter();
  _resetSessionCounter();

  const workerRegistry = new WorkerRegistry();
  workerRegistry.register(WOODCUTTER_DEF);
  workerRegistry.register(MINER_DEF);

  const taskRegistry = new WorkerTaskRegistry();
  taskRegistry.register(CHOP_TASK);
  taskRegistry.register(MINE_TASK);

  const workerManager = new WorkerManager(workerRegistry);
  const assignmentManager = new WorkerAssignmentManager(workerManager, taskRegistry);
  const execEvents = new EventBus<WorkerExecutionEventMap>();
  const executor = new WorkerExecutor(workerManager, assignmentManager, taskRegistry, execEvents);
  const scheduler = new WorkerScheduler(execEvents);
  const integrationEvents = new EventBus<WorkerIntegrationEventMap>();
  const coordinator = new WorkerCoordinator(
    workerManager,
    assignmentManager,
    executor,
    scheduler,
    integrationEvents,
  );

  return {
    workerRegistry,
    taskRegistry,
    workerManager,
    assignmentManager,
    executor,
    scheduler,
    integrationEvents,
    coordinator,
  };
}

// ── Tests ───────────────────────────────────────────────────────────

describe("WorkerIntegration", () => {
  describe("full cycle", () => {
    it("register → recruit → assign → execute → tick to completion", () => {
      const { coordinator, scheduler } = setup();

      // Recruit and assign
      const recruit = coordinator.recruitAndAssign(WOODCUTTER_DEF_ID, CHOP_TASK_ID);
      expect(recruit.ok).toBe(true);
      if (!recruit.ok) return;

      // Execute
      const exec = coordinator.executeWorkerTask(recruit.workerId);
      expect(exec.ok).toBe(true);

      // Tick to completion (3 ticks for chop task)
      coordinator.tickAll();
      coordinator.tickAll();

      const session = scheduler.getSession(recruit.workerId);
      expect(session).toBeDefined();
      expect(session!.isComplete()).toBe(false);

      coordinator.tickAll();
      expect(session!.isComplete()).toBe(true);
    });
  });

  describe("multiple workers", () => {
    it("runs two workers simultaneously", () => {
      const { coordinator, scheduler } = setup();

      const r1 = coordinator.recruitAndAssign(WOODCUTTER_DEF_ID, CHOP_TASK_ID, "Lumberjack A");
      const r2 = coordinator.recruitAndAssign(MINER_DEF_ID, MINE_TASK_ID, "Miner B");
      expect(r1.ok).toBe(true);
      expect(r2.ok).toBe(true);
      if (!r1.ok || !r2.ok) return;

      coordinator.executeWorkerTask(r1.workerId);
      coordinator.executeWorkerTask(r2.workerId);

      expect(scheduler.getActiveSessions().length).toBe(2);

      // Tick twice — miner finishes (2 ticks), woodcutter still going
      coordinator.tickAll();
      coordinator.tickAll();

      const minerSession = scheduler.getSession(r2.workerId);
      expect(minerSession!.isComplete()).toBe(true);

      const woodcutterSession = scheduler.getSession(r1.workerId);
      expect(woodcutterSession!.isComplete()).toBe(false);

      // One more tick — woodcutter finishes
      coordinator.tickAll();
      expect(woodcutterSession!.isComplete()).toBe(true);
    });
  });

  describe("getWorkerStatus", () => {
    it("returns worker, assignment, and session info", () => {
      const { coordinator } = setup();

      const recruit = coordinator.recruitAndAssign(WOODCUTTER_DEF_ID, CHOP_TASK_ID);
      expect(recruit.ok).toBe(true);
      if (!recruit.ok) return;

      // Before execution
      const statusBefore = coordinator.getWorkerStatus(recruit.workerId);
      expect(statusBefore).toBeDefined();
      expect(statusBefore!.worker.state).toBe("assigned");
      expect(statusBefore!.assignment).toBeDefined();
      expect(statusBefore!.session).toBeUndefined();

      // After execution
      coordinator.executeWorkerTask(recruit.workerId);
      const statusAfter = coordinator.getWorkerStatus(recruit.workerId);
      expect(statusAfter!.worker.state).toBe("working");
      expect(statusAfter!.session).toBeDefined();
      expect(statusAfter!.session!.state).toBe("executing");
    });

    it("returns undefined for unknown worker", () => {
      const { coordinator } = setup();
      expect(coordinator.getWorkerStatus(asWorkerId("nonexistent"))).toBeUndefined();
    });
  });

  describe("save state", () => {
    it("serialization round-trip preserves data", () => {
      const { coordinator, workerManager, assignmentManager } = setup();

      coordinator.recruitAndAssign(WOODCUTTER_DEF_ID, CHOP_TASK_ID, "Woody");
      coordinator.recruitAndAssign(MINER_DEF_ID, MINE_TASK_ID, "Rocky");

      const workers = workerManager.getAllWorkers();
      const assignments = assignmentManager.getAllAssignments();

      const state = serializeWorkerState(workers, assignments, []);
      const json = JSON.stringify(state);
      const restored = deserializeWorkerState(json);

      expect(restored.workers.length).toBe(2);
      expect(restored.workers[0]!.displayName).toBe("Woody");
      expect(restored.workers[1]!.displayName).toBe("Rocky");
      expect(restored.assignments.length).toBe(2);
      expect(restored.automations.length).toBe(0);
    });
  });

  describe("integration events", () => {
    it("emits workerIntegration:recruited on recruitAndAssign", () => {
      const { coordinator, integrationEvents } = setup();

      const events: unknown[] = [];
      integrationEvents.subscribe("workerIntegration:recruited", (e) => events.push(e));

      coordinator.recruitAndAssign(WOODCUTTER_DEF_ID, CHOP_TASK_ID, "Logger");
      expect(events.length).toBe(1);
      expect((events[0] as { displayName: string }).displayName).toBe("Logger");
    });

    it("emits workerIntegration:taskCompleted when session finishes", () => {
      const { coordinator, integrationEvents } = setup();

      const events: unknown[] = [];
      integrationEvents.subscribe("workerIntegration:taskCompleted", (e) => events.push(e));

      const recruit = coordinator.recruitAndAssign(WOODCUTTER_DEF_ID, CHOP_TASK_ID);
      if (!recruit.ok) return;
      coordinator.executeWorkerTask(recruit.workerId);

      coordinator.tickAll();
      coordinator.tickAll();
      coordinator.tickAll(); // completes at tick 3

      expect(events.length).toBe(1);
      expect((events[0] as { yield: number }).yield).toBe(10);
    });

    it("emits workerIntegration:cycleDone on each tickAll", () => {
      const { coordinator, integrationEvents } = setup();

      const events: unknown[] = [];
      integrationEvents.subscribe("workerIntegration:cycleDone", (e) => events.push(e));

      coordinator.tickAll();
      expect(events.length).toBe(1);
    });
  });

  describe("error cases", () => {
    it("fails recruitment with unknown definition", () => {
      const { coordinator } = setup();
      const unknownDef = asWorkerDefinitionId("def_unknown");
      const result = coordinator.recruitAndAssign(unknownDef, CHOP_TASK_ID);
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.reason).toContain("def_unknown");
      }
    });

    it("fails assignment on profession mismatch", () => {
      const { coordinator } = setup();
      // Miner can't do woodcutter task
      const result = coordinator.recruitAndAssign(MINER_DEF_ID, CHOP_TASK_ID);
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.reason.length).toBeGreaterThan(0);
      }
    });
  });
});

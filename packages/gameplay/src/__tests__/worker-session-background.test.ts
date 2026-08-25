import { describe, expect, it } from "vitest";
import { WorkerSession } from "../worker-execution/worker-session.js";
import {
  asWorkerSessionId,
} from "../worker-execution/worker-execution-types.js";
import { asWorkerId } from "../workers/worker-types.js";
import { asWorkerTaskDefinitionId } from "../worker-tasks/worker-task-types.js";

describe("WorkerSession bulk advancement", () => {
  it("advances to the completion boundary without replaying each tick", () => {
    const session = new WorkerSession(
      asWorkerSessionId("background-session"),
      asWorkerId("background-worker"),
      asWorkerTaskDefinitionId("background-task"),
      {
        baseDurationTicks: 10,
        speedModifier: 1,
        yieldModifier: 1,
      },
    );
    session.start();

    expect(session.advanceTicks(4)).toBe(4);
    expect(session.elapsedTicks).toBe(4);
    expect(session.state).toBe("executing");

    expect(session.advanceTicks(100)).toBe(6);
    expect(session.elapsedTicks).toBe(10);
    expect(session.state).toBe("completed");
    expect(session.advanceTicks(1)).toBe(0);
  });

  it("rejects invalid tick deltas", () => {
    const session = new WorkerSession(
      asWorkerSessionId("invalid-session"),
      asWorkerId("invalid-worker"),
      asWorkerTaskDefinitionId("invalid-task"),
      {
        baseDurationTicks: 10,
        speedModifier: 1,
        yieldModifier: 1,
      },
    );
    session.start();

    expect(() => session.advanceTicks(-1)).toThrow();
    expect(() => session.advanceTicks(1.5)).toThrow();
  });
});

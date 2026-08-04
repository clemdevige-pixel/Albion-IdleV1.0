import type { EventBus } from "@game/core";
import type { WorkerId } from "../workers/index.js";
import type { WorkerExecutionEventMap } from "./worker-execution-events.js";
import type { WorkerSession } from "./worker-session.js";

// ---------------------------------------------------------------------------
// Scheduler
// ---------------------------------------------------------------------------

export class WorkerScheduler {
  readonly #sessions = new Map<WorkerId, WorkerSession>();
  readonly #events: EventBus<WorkerExecutionEventMap>;

  constructor(events: EventBus<WorkerExecutionEventMap>) {
    this.#events = events;
  }

  addSession(session: WorkerSession): void {
    this.#sessions.set(session.workerId, session);
  }

  removeSession(workerId: WorkerId): boolean {
    return this.#sessions.delete(workerId);
  }

  getSession(workerId: WorkerId): WorkerSession | undefined {
    return this.#sessions.get(workerId);
  }

  getActiveSessions(): readonly WorkerSession[] {
    return [...this.#sessions.values()].filter(
      (s) => s.state === "executing",
    );
  }

  getAllSessions(): readonly WorkerSession[] {
    return [...this.#sessions.values()];
  }

  tickAll(): void {
    for (const session of this.#sessions.values()) {
      if (session.state !== "executing") continue;

      const advanced = session.tick();
      if (!advanced) continue;

      this.#events.publish("workerExec:tick", {
        sessionId: session.id,
        workerId: session.workerId,
        elapsedTicks: session.elapsedTicks,
        totalTicks: session.totalTicks,
      });

      if (session.isComplete()) {
        const result = session.produceResult();
        this.#events.publish("workerExec:completed", {
          sessionId: session.id,
          result,
        });
      }
    }
  }
}

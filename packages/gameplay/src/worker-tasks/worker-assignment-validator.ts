import type { WorkerInstance } from "../workers/index.js";
import type { WorkerTaskDefinition } from "./worker-task-types.js";

export type ValidationResult =
  | { readonly ok: true }
  | { readonly ok: false; readonly reason: string };

export function validateAssignment(
  worker: WorkerInstance,
  taskDef: WorkerTaskDefinition,
): ValidationResult {
  if (worker.state === "inactive") {
    return { ok: false, reason: "Worker is inactive and cannot be assigned" };
  }

  if (worker.state !== "idle" && worker.state !== "assigned") {
    return {
      ok: false,
      reason: `Worker state "${worker.state}" does not allow assignment`,
    };
  }

  if (worker.profession !== taskDef.requiredProfession) {
    return {
      ok: false,
      reason: `Worker profession "${worker.profession}" does not match required "${taskDef.requiredProfession}"`,
    };
  }

  return { ok: true };
}

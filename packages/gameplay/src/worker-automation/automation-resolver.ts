import type { WorkerId } from "../workers/index.js";
import type { WorkerTaskDefinitionId } from "../worker-tasks/index.js";
import type { AutomationQueue } from "./automation-queue.js";
import type { AutomationRule } from "./automation-rules.js";

export type ResolveNextTaskResult =
  | { readonly ok: true; readonly taskDefId: WorkerTaskDefinitionId }
  | { readonly ok: false; readonly reason: string };

export function resolveNextTask(
  queue: AutomationQueue,
  rules: readonly AutomationRule[],
  workerId: WorkerId,
): ResolveNextTaskResult {
  const next = queue.getNext();
  if (next === undefined) {
    return { ok: false, reason: "queue_empty" };
  }
  for (const rule of rules) {
    if (!rule.canExecute(workerId, next)) {
      return { ok: false, reason: "rule_blocked" };
    }
  }
  return { ok: true, taskDefId: next };
}

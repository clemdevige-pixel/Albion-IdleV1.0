import type { AutomationQueueEntry } from "./automation-types.js";

export class AutomationQueue {
  #entries: { taskDefId: AutomationQueueEntry["taskDefId"]; remainingRepeats: number }[];

  constructor(entries: readonly AutomationQueueEntry[]) {
    this.#entries = entries.map((e) => ({
      taskDefId: e.taskDefId,
      remainingRepeats: e.repeatCount,
    }));
  }

  getNext(): AutomationQueueEntry["taskDefId"] | undefined {
    const first = this.#entries[0];
    if (first === undefined) return undefined;
    return first.taskDefId;
  }

  advance(): boolean {
    const current = this.#entries[0];
    if (current === undefined) return false;
    if (current.remainingRepeats === -1) {
      return true;
    }
    current.remainingRepeats--;
    if (current.remainingRepeats <= 0) {
      this.#entries.shift();
    }
    return true;
  }

  reset(entries: readonly AutomationQueueEntry[]): void {
    this.#entries = entries.map((e) => ({
      taskDefId: e.taskDefId,
      remainingRepeats: e.repeatCount,
    }));
  }

  isEmpty(): boolean {
    return this.#entries.length === 0;
  }

  size(): number {
    return this.#entries.length;
  }

  getAll(): readonly { taskDefId: AutomationQueueEntry["taskDefId"]; remainingRepeats: number }[] {
    return [...this.#entries];
  }

  addTask(entry: AutomationQueueEntry): void {
    this.#entries.push({
      taskDefId: entry.taskDefId,
      remainingRepeats: entry.repeatCount,
    });
  }

  removeTask(index: number): boolean {
    if (index < 0 || index >= this.#entries.length) return false;
    this.#entries.splice(index, 1);
    return true;
  }
}

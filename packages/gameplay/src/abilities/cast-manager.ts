import type { AbilityEntry } from "./types.js";

export class CastManager {
  startCast(entry: AbilityEntry, castTime: number): void {
    entry.castTimeRemaining = castTime;
    entry.state = "casting";
  }

  tickCast(entry: AbilityEntry, deltaTime: number): boolean {
    if (entry.state !== "casting") return false;
    entry.castTimeRemaining = Math.max(0, entry.castTimeRemaining - deltaTime);
    return entry.castTimeRemaining <= 0;
  }

  interruptCast(entry: AbilityEntry): boolean {
    if (entry.state !== "casting") return false;
    if (!entry.definition.interruptible) return false;
    entry.state = "ready";
    entry.castTimeRemaining = 0;
    return true;
  }

  isCasting(entry: AbilityEntry): boolean {
    return entry.state === "casting";
  }
}

import type { AbilityEntry } from "./types.js";

export class CooldownManager {
  startCooldown(entry: AbilityEntry, duration: number): void {
    entry.cooldownRemaining = duration;
    entry.state = "cooldown";
  }

  tickCooldown(entry: AbilityEntry, deltaTime: number): boolean {
    if (entry.state !== "cooldown") return false;
    entry.cooldownRemaining = Math.max(0, entry.cooldownRemaining - deltaTime);
    if (entry.cooldownRemaining <= 0) {
      entry.state = "ready";
      return true;
    }
    return false;
  }

  isOnCooldown(entry: AbilityEntry): boolean {
    return entry.state === "cooldown" && entry.cooldownRemaining > 0;
  }

  getRemainingCooldown(entry: AbilityEntry): number {
    return entry.cooldownRemaining;
  }
}

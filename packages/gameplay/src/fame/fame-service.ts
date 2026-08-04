import type { EventBus } from "@game/core";
import type { ExperienceService } from "../experience/experience-service.js";
import type { ExperienceSource, MasteryId } from "../experience/types.js";
import type { FameEventMap } from "./fame-events.js";
import {
  type FameCategory,
  type FameGainRequest,
  type FameRecord,
  type FameResult,
  fameOk,
  fameFail,
} from "./types.js";

/** Maps FameCategory to ExperienceSource. */
function categoryToSource(category: FameCategory): ExperienceSource {
  return category;
}

export interface FameAwardValue {
  readonly masteryId: MasteryId;
  readonly fameAwarded: number;
  readonly previousLevel: number;
  readonly newLevel: number;
  readonly levelsGained: number;
}

/**
 * Distribution layer that routes fame to masteries via ExperienceService.
 *
 * Fame IS experience from the player's perspective (Albion "Fame" concept).
 * This service validates requests, delegates to ExperienceService, and
 * maintains a history of fame gains.
 */
export class FameService {
  private readonly history: FameRecord[] = [];
  private readonly totalPerMastery = new Map<MasteryId, number>();
  private eventBus: EventBus<FameEventMap> | undefined;

  constructor(private readonly experienceService: ExperienceService) {}

  /** Optionally wire an event bus for fame notifications. */
  setEventBus(bus: EventBus<FameEventMap>): void {
    this.eventBus = bus;
  }

  /** Award fame to a mastery, delegating to ExperienceService. */
  awardFame(request: FameGainRequest): FameResult<FameAwardValue> {
    const { targetMasteryId, amount, category } = request;

    if (!Number.isInteger(amount) || amount <= 0) {
      return fameFail("invalid_amount");
    }

    const source = categoryToSource(category);
    const result = this.experienceService.addExperience(targetMasteryId, amount, source);

    if (!result.ok) {
      // Map ExperienceFailureReason to FameFailureReason
      switch (result.reason) {
        case "mastery_not_registered":
        case "mastery_not_found":
          return fameFail("mastery_not_found");
        case "max_level_reached":
          return fameFail("max_level_reached");
        case "invalid_amount":
          return fameFail("invalid_amount");
      }
    }

    const { value } = result;

    // Track totals
    const previousTotal = this.totalPerMastery.get(targetMasteryId) ?? 0;
    const newTotal = previousTotal + amount;
    this.totalPerMastery.set(targetMasteryId, newTotal);

    // Record history (timestamp is caller-provided or 0 for determinism)
    this.history.push({
      masteryId: targetMasteryId,
      fameEarned: amount,
      category,
      timestamp: 0,
    });

    // Emit events
    if (this.eventBus !== undefined) {
      this.eventBus.publish("FameAwarded", {
        masteryId: targetMasteryId,
        amount,
        category,
        previousLevel: value.previousLevel,
        newLevel: value.newLevel,
      });

      // Milestone every 1000 fame
      const previousMilestone = Math.floor(previousTotal / 1000);
      const newMilestone = Math.floor(newTotal / 1000);
      if (newMilestone > previousMilestone) {
        this.eventBus.publish("FameMilestone", {
          masteryId: targetMasteryId,
          totalFame: newTotal,
          milestone: newMilestone * 1000,
        });
      }
    }

    return fameOk({
      masteryId: targetMasteryId,
      fameAwarded: amount,
      previousLevel: value.previousLevel,
      newLevel: value.newLevel,
      levelsGained: value.levelsGained,
    });
  }

  /** Returns the full fame history. */
  getFameHistory(): readonly FameRecord[] {
    return this.history;
  }

  /** Total fame earned, optionally filtered by mastery. */
  getTotalFameEarned(masteryId?: MasteryId): number {
    if (masteryId !== undefined) {
      return this.totalPerMastery.get(masteryId) ?? 0;
    }
    let total = 0;
    for (const amount of this.totalPerMastery.values()) {
      total += amount;
    }
    return total;
  }

  /** Clear all history and totals. */
  clearHistory(): void {
    this.history.length = 0;
    this.totalPerMastery.clear();
  }

  /** @internal Used by save provider to snapshot state. */
  _snapshot(): { totals: ReadonlyMap<MasteryId, number>; history: readonly FameRecord[] } {
    return { totals: this.totalPerMastery, history: this.history };
  }

  /** @internal Used by save provider to restore state. */
  _restore(totals: ReadonlyMap<MasteryId, number>, history: readonly FameRecord[]): void {
    this.totalPerMastery.clear();
    for (const [id, amount] of totals) {
      this.totalPerMastery.set(id, amount);
    }
    this.history.length = 0;
    for (const record of history) {
      this.history.push(record);
    }
  }
}

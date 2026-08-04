import type { EventBus } from "@game/core";
import type { ExperienceTable } from "./experience-table.js";
import type { ExperienceEventMap } from "./experience-events.js";
import {
  type ExperienceGainResult,
  type ExperienceSource,
  type MasteryId,
  type MasteryProgress,
  experienceOk,
  experienceFail,
} from "./types.js";

interface MasteryState {
  table: ExperienceTable;
  maxLevel: number;
  level: number;
  currentXp: number;
  totalLifetimeXp: number;
}

/**
 * Manages mastery progress for a player (28_EXPERIENCE_SYSTEM).
 *
 * All XP goes to weapon masteries; there is no character-level XP.
 * XP overflow carries over, enabling simultaneous multi-level-ups.
 * At max level, additional XP is silently ignored.
 */
export class ExperienceService {
  private readonly masteries = new Map<MasteryId, MasteryState>();
  private eventBus: EventBus<ExperienceEventMap> | undefined;

  /** Optionally wire an event bus for UI notifications. */
  setEventBus(bus: EventBus<ExperienceEventMap>): void {
    this.eventBus = bus;
  }

  /** Register a mastery for tracking. */
  registerMastery(masteryId: MasteryId, table: ExperienceTable, maxLevel: number): void {
    this.masteries.set(masteryId, {
      table,
      maxLevel,
      level: 0,
      currentXp: 0,
      totalLifetimeXp: 0,
    });
  }

  getMasteryProgress(masteryId: MasteryId): MasteryProgress | undefined {
    const state = this.masteries.get(masteryId);
    if (state === undefined) {
      return undefined;
    }
    return {
      masteryId,
      level: state.level,
      currentXp: state.currentXp,
      totalLifetimeXp: state.totalLifetimeXp,
    };
  }

  addExperience(
    masteryId: MasteryId,
    amount: number,
    source: ExperienceSource,
  ): ExperienceGainResult {
    if (!Number.isInteger(amount) || amount <= 0) {
      return experienceFail("invalid_amount");
    }

    const state = this.masteries.get(masteryId);
    if (state === undefined) {
      return experienceFail("mastery_not_registered");
    }

    if (state.level >= state.maxLevel) {
      return experienceFail("max_level_reached");
    }

    const previousLevel = state.level;

    // Cap XP so we don't store overflow beyond max level
    state.totalLifetimeXp += amount;
    const computed = state.table.getLevel(state.totalLifetimeXp, state.maxLevel);
    state.level = computed.level;
    state.currentXp = computed.remainingXp;

    const levelsGained = state.level - previousLevel;

    // Emit events
    if (this.eventBus !== undefined) {
      this.eventBus.publish("ExperienceGained", {
        masteryId,
        amount,
        source,
        newTotal: state.totalLifetimeXp,
        level: state.level,
      });

      if (levelsGained > 0) {
        this.eventBus.publish("LevelUp", {
          masteryId,
          previousLevel,
          newLevel: state.level,
          totalXp: state.totalLifetimeXp,
        });
      }
    }

    return experienceOk({
      masteryId,
      xpAdded: amount,
      previousLevel,
      newLevel: state.level,
      currentXp: state.currentXp,
      levelsGained,
    });
  }

  getAllProgress(): ReadonlyMap<MasteryId, MasteryProgress> {
    const result = new Map<MasteryId, MasteryProgress>();
    for (const [id, state] of this.masteries) {
      result.set(id, {
        masteryId: id,
        level: state.level,
        currentXp: state.currentXp,
        totalLifetimeXp: state.totalLifetimeXp,
      });
    }
    return result;
  }

  /** @internal Used by save provider to restore state. */
  _restore(
    masteryId: MasteryId,
    table: ExperienceTable,
    maxLevel: number,
    totalLifetimeXp: number,
  ): void {
    const computed = table.getLevel(totalLifetimeXp, maxLevel);
    this.masteries.set(masteryId, {
      table,
      maxLevel,
      level: computed.level,
      currentXp: computed.remainingXp,
      totalLifetimeXp,
    });
  }

  /** @internal Used by save provider to snapshot state. */
  _snapshot(): ReadonlyMap<MasteryId, { totalLifetimeXp: number; maxLevel: number }> {
    const result = new Map<MasteryId, { totalLifetimeXp: number; maxLevel: number }>();
    for (const [id, state] of this.masteries) {
      result.set(id, { totalLifetimeXp: state.totalLifetimeXp, maxLevel: state.maxLevel });
    }
    return result;
  }
}

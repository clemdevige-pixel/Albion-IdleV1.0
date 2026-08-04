import type { ExperienceSource, MasteryId } from "./types.js";

/** Payload emitted when experience is gained. */
export interface ExperienceGainedEvent {
  readonly masteryId: MasteryId;
  readonly amount: number;
  readonly source: ExperienceSource;
  readonly newTotal: number;
  readonly level: number;
}

/** Payload emitted when a mastery levels up. */
export interface LevelUpEvent {
  readonly masteryId: MasteryId;
  readonly previousLevel: number;
  readonly newLevel: number;
  readonly totalXp: number;
}

/** Event map for use with `EventBus<ExperienceEventMap>`. */
export interface ExperienceEventMap {
  ExperienceGained: ExperienceGainedEvent;
  LevelUp: LevelUpEvent;
}

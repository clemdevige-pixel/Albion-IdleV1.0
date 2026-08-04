import type { MasteryId } from "../experience/types.js";

/** Emitted when a mastery is first discovered (unlocked). */
export interface MasteryDiscoveredEvent {
  readonly masteryId: MasteryId;
}

/** Emitted when a mastery levels up (forwarded from ExperienceService). */
export interface MasteryLevelUpEvent {
  readonly masteryId: MasteryId;
  readonly previousLevel: number;
  readonly newLevel: number;
}

/** Emitted when overflow XP is generated from a max-level mastery. */
export interface OverflowGeneratedEvent {
  readonly masteryId: MasteryId;
  readonly overflowAmount: number;
  readonly totalOverflow: number;
}

/** Event map for use with `EventBus<MasteryEventMap>`. */
export interface MasteryEventMap {
  MasteryDiscovered: MasteryDiscoveredEvent;
  MasteryLevelUp: MasteryLevelUpEvent;
  OverflowGenerated: OverflowGeneratedEvent;
}

import type { MasteryId } from "../experience/types.js";
import type { FameCategory } from "./types.js";

/** Payload emitted when fame is awarded. */
export interface FameAwardedEvent {
  readonly masteryId: MasteryId;
  readonly amount: number;
  readonly category: FameCategory;
  readonly previousLevel: number;
  readonly newLevel: number;
}

/** Payload emitted when a fame milestone is reached. */
export interface FameMilestoneEvent {
  readonly masteryId: MasteryId;
  readonly totalFame: number;
  readonly milestone: number;
}

/** Event map for use with `EventBus<FameEventMap>`. */
export interface FameEventMap {
  FameAwarded: FameAwardedEvent;
  FameMilestone: FameMilestoneEvent;
}

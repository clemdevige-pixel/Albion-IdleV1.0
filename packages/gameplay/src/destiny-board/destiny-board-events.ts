import type { DestinyNodeId } from "./types.js";
import type { DestinyReward } from "./types.js";

/** Payload emitted when a node is unlocked. */
export interface NodeUnlockedEvent {
  readonly nodeId: DestinyNodeId;
  readonly rewards: readonly DestinyReward[];
}

/** Payload emitted when a node becomes eligible for unlock. */
export interface NodeEligibleEvent {
  readonly nodeId: DestinyNodeId;
}

/** Event map for use with `EventBus<DestinyBoardEventMap>`. */
export interface DestinyBoardEventMap {
  NodeUnlocked: NodeUnlockedEvent;
  NodeEligible: NodeEligibleEvent;
}

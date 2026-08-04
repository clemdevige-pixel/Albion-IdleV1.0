import type { Brand } from "@game/core";
import type { MasteryId } from "../experience/types.js";

/** Branded identifier for a Destiny Board node. */
export type DestinyNodeId = Brand<string, "DestinyNodeId">;

export function asDestinyNodeId(s: string): DestinyNodeId {
  return s as DestinyNodeId;
}

/** Current state of a node on the Destiny Board. */
export type DestinyNodeState = "locked" | "unlocked" | "completed";

/** Requirement that must be met to unlock a node. */
export type DestinyRequirement = {
  readonly type: "mastery_level";
  readonly masteryId: MasteryId;
  readonly level: number;
};

/** Reward granted when a node is unlocked. */
export type DestinyReward = {
  readonly type: "equipment_tier_unlock";
  readonly tier: number;
};

/** Definition of a node on the Destiny Board. */
export interface DestinyNodeDefinition {
  readonly id: DestinyNodeId;
  readonly displayName: string;
  readonly category: string;
  readonly prerequisites: readonly DestinyNodeId[];
  readonly requirements: readonly DestinyRequirement[];
  readonly rewards: readonly DestinyReward[];
}

/** Reasons a Destiny Board operation can fail. */
export type DestinyBoardFailureReason =
  | "node_not_found"
  | "node_already_unlocked"
  | "prerequisites_not_met"
  | "requirements_not_met"
  | "invalid_definition"
  | "duplicate_node";

/** Discriminated result union for Destiny Board operations. */
export type DestinyBoardResult<T> =
  | { readonly ok: true; readonly value: T }
  | { readonly ok: false; readonly reason: DestinyBoardFailureReason };

export function destinyOk<T>(value: T): DestinyBoardResult<T> {
  return { ok: true, value };
}

export function destinyFail<T>(reason: DestinyBoardFailureReason): DestinyBoardResult<T> {
  return { ok: false, reason };
}

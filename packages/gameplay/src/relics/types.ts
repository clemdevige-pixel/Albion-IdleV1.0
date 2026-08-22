import type { FactionId } from "../faction-knowledge/types.js";

export type RelicId = string;
export type RelicState = "unobtained" | "broken" | "charged" | "examined";

export interface RelicDefinition {
  readonly id: RelicId;
  readonly factionId: FactionId;
  readonly sourceBossMonsterId: string;
  readonly inventoryItemId: string;
  readonly chargeKillCount: number;
}

export interface RelicProgressPort {
  getFactionKillCount(factionId: FactionId): number;
}

export interface RelicReconstructionPort {
  /** Compatibility name: reconstruction now means Academy examination. */
  canReconstructRelic(definition: RelicDefinition): boolean;
}

export interface RelicProgressView {
  readonly relicId: RelicId;
  readonly state: RelicState;
  readonly chargeKills: number;
  readonly requiredChargeKills: number;
  /** Compatibility alias for downstream Research/Achievement contracts. */
  readonly reconstructed: boolean;
}

export type RegisterRelicResult =
  | { readonly ok: true }
  | { readonly ok: false; readonly reason: "invalid_definition" | "duplicate_relic" };

export type ExamineRelicResult =
  | { readonly ok: true }
  | {
    readonly ok: false;
    readonly reason: "unknown_relic" | "not_acquired" | "not_charged" | "examination_locked" | "already_examined";
  };

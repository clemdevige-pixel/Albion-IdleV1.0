import type { FactionId } from "../faction-knowledge/types.js";

export type RelicId = string;
export type RelicState = "unobtained" | "broken" | "charged" | "examined";

export interface RelicChargeRequirement {
  readonly factionId: FactionId;
  readonly killCount: number;
}

export interface RelicSourceDefinition {
  readonly monsterId: string;
  /** Optional authored world/context identifier used to disambiguate reused monster definitions. */
  readonly contextId?: string;
  /** Optional zero-based authored segment index. */
  readonly segmentIndex?: number;
}

export interface RelicDefinition {
  readonly id: RelicId;
  readonly inventoryItemId: string;
  readonly source?: RelicSourceDefinition;
  readonly chargeRequirements?: readonly RelicChargeRequirement[];

  /** @deprecated Legacy single-faction authoring compatibility. */
  readonly factionId?: FactionId;
  /** @deprecated Legacy source compatibility. Prefer source.monsterId. */
  readonly sourceBossMonsterId?: string;
  /** @deprecated Legacy single-faction authoring compatibility. */
  readonly chargeKillCount?: number;
}

export interface RelicKillEvent {
  readonly monsterId: string;
  readonly contextId?: string;
  readonly segmentIndex?: number;
}

export interface RelicProgressPort {
  getFactionKillCount(factionId: FactionId): number;
}

export interface RelicChargeObjectiveProgress {
  readonly factionId: FactionId;
  readonly chargeKills: number;
  readonly requiredChargeKills: number;
}

export interface RelicProgressView {
  readonly relicId: RelicId;
  readonly state: RelicState;
  /** Aggregate compatibility/progress value across every authored charge objective. */
  readonly chargeKills: number;
  /** Aggregate compatibility/progress target across every authored charge objective. */
  readonly requiredChargeKills: number;
  readonly chargeObjectives: readonly RelicChargeObjectiveProgress[];
  /** Compatibility alias for downstream Achievement contracts. */
  readonly reconstructed: boolean;
}

export type RegisterRelicResult =
  | { readonly ok: true }
  | { readonly ok: false; readonly reason: "invalid_definition" | "duplicate_relic" };

export type ExamineRelicResult =
  | { readonly ok: true }
  | {
    readonly ok: false;
    readonly reason: "unknown_relic" | "not_acquired" | "not_charged" | "already_examined";
  };

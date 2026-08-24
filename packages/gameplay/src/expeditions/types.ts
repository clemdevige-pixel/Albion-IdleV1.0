export const EXPEDITION_DURATION_OPTIONS_MS = [
  2 * 60 * 60 * 1000,
  6 * 60 * 60 * 1000,
  12 * 60 * 60 * 1000,
] as const;

export type ExpeditionDurationMs = (typeof EXPEDITION_DURATION_OPTIONS_MS)[number];
export type ExpeditionId = string;
export type ExpeditionTypeId = string;

export interface ExpeditionRequirementDefinition {
  readonly type: string;
}

export interface ExpeditionDefinition<
  TRequirement extends ExpeditionRequirementDefinition = ExpeditionRequirementDefinition,
> {
  readonly id: ExpeditionId;
  readonly typeId: ExpeditionTypeId;
  readonly displayName: string;
  readonly tier: number;
  readonly requirements: readonly TRequirement[];
  readonly supportedDurationsMs?: readonly ExpeditionDurationMs[];
}

export interface ActiveExpeditionState {
  readonly slotIndex: number;
  readonly expeditionId: ExpeditionId;
  readonly typeId: ExpeditionTypeId;
  readonly durationMs: ExpeditionDurationMs;
  readonly remainingDurationMs: number;
}

export interface ExpeditionCompletion<
  TRewardSummary = unknown,
> {
  readonly slotIndex: number;
  readonly expeditionId: ExpeditionId;
  readonly typeId: ExpeditionTypeId;
  readonly durationMs: ExpeditionDurationMs;
  readonly rewardSummary: TRewardSummary;
}

export type ExpeditionStartState =
  | "available"
  | "requirements_locked"
  | "type_active"
  | "no_available_slot";

export type RegisterExpeditionResult =
  | { readonly ok: true }
  | { readonly ok: false; readonly reason: "invalid_definition" | "duplicate_expedition" };

export type StartExpeditionResult =
  | { readonly ok: true; readonly activeExpedition: ActiveExpeditionState }
  | {
    readonly ok: false;
    readonly reason:
      | "expedition_not_found"
      | "invalid_duration"
      | "requirements_not_met"
      | "no_available_slot"
      | "type_already_active";
  };

export type CancelExpeditionResult =
  | { readonly ok: true; readonly cancelledExpedition: ActiveExpeditionState }
  | { readonly ok: false; readonly reason: "active_expedition_not_found" };

export interface ExpeditionAdvanceResult<TRewardSummary = unknown> {
  readonly completed: readonly ExpeditionCompletion<TRewardSummary>[];
  readonly activeExpeditions: readonly ActiveExpeditionState[];
}

export interface ExpeditionRequirementPort<
  TRequirement extends ExpeditionRequirementDefinition = ExpeditionRequirementDefinition,
> {
  isRequirementMet(
    requirement: TRequirement,
    definition: ExpeditionDefinition<TRequirement>,
  ): boolean;
}

export interface ExpeditionSlotCapacityPort {
  getSlotCapacity(): number;
}

export interface ExpeditionRewardPort<
  TRequirement extends ExpeditionRequirementDefinition = ExpeditionRequirementDefinition,
  TRewardSummary = unknown,
> {
  grantCompletionReward(
    definition: ExpeditionDefinition<TRequirement>,
    durationMs: ExpeditionDurationMs,
  ): TRewardSummary;
}
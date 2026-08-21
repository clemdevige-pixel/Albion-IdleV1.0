export type ResearchId = string;
export type ResearchUnlockId = string;

export interface ResearchRequirementDefinition {
  readonly type: string;
}

export interface ResearchMaterialCostDefinition {
  readonly itemId: string;
  readonly quantity: number;
}

export interface ResearchCostDefinition {
  readonly silver: number;
  readonly materials: readonly ResearchMaterialCostDefinition[];
}

export interface ResearchDefinition<
  TRequirement extends ResearchRequirementDefinition = ResearchRequirementDefinition,
> {
  readonly id: ResearchId;
  readonly displayName: string;
  readonly tier: number;
  readonly durationMs: number;
  readonly cost: ResearchCostDefinition;
  readonly requirements: readonly TRequirement[];
  readonly unlockIds: readonly ResearchUnlockId[];
}

export interface ActiveResearchState {
  readonly researchId: ResearchId;
  readonly remainingDurationMs: number;
}

export type ResearchEntryState = "locked" | "available" | "active" | "completed";

export type RegisterResearchResult =
  | { readonly ok: true }
  | { readonly ok: false; readonly reason: "invalid_definition" | "duplicate_research" };

export type StartResearchResult =
  | { readonly ok: true; readonly activeResearch: ActiveResearchState }
  | {
    readonly ok: false;
    readonly reason:
      | "research_not_found"
      | "already_completed"
      | "research_slot_occupied"
      | "requirements_not_met"
      | "payment_failed";
  };

export interface ResearchAdvanceResult {
  readonly completedResearchId: ResearchId | undefined;
  readonly activeResearch: ActiveResearchState | undefined;
}

export interface ResearchRequirementPort<
  TRequirement extends ResearchRequirementDefinition = ResearchRequirementDefinition,
> {
  isRequirementMet(
    requirement: TRequirement,
    definition: ResearchDefinition<TRequirement>,
  ): boolean;
}

export interface ResearchPaymentPort {
  /** Must validate and consume the complete cost atomically. */
  tryConsumeResearchCost(cost: ResearchCostDefinition): boolean;
}

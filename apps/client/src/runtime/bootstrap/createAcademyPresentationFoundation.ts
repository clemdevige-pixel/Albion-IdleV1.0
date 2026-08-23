import {
  EXPEDITION_DURATION_OPTIONS_MS,
  type ActiveResearchState,
  type ExpeditionDurationMs,
  type ExpeditionRequirementDefinition,
  type ExpeditionService,
  type ExpeditionStartState,
  type ResearchRequirementDefinition,
  type ResearchService,
  type StartExpeditionResult,
  type StartResearchResult,
} from "@game/gameplay";

export interface AcademyResearchEntryModel {
  readonly id: string;
  readonly displayName: string;
  readonly tier: number;
  readonly state: "locked" | "available" | "active" | "completed";
  readonly durationMs: number;
  readonly remainingDurationMs: number | undefined;
  readonly silverCost: number;
  readonly materials: readonly { readonly itemId: string; readonly quantity: number }[];
}

export interface AcademyExpeditionEntryModel {
  readonly id: string;
  readonly typeId: string;
  readonly displayName: string;
  readonly tier: number;
  readonly active: boolean;
  readonly startState: ExpeditionStartState;
  readonly activeSlotIndex: number | undefined;
  readonly activeDurationMs: ExpeditionDurationMs | undefined;
  readonly remainingDurationMs: number | undefined;
  readonly supportedDurationsMs: readonly ExpeditionDurationMs[];
}

export interface AcademyPresentationModel {
  readonly research: readonly AcademyResearchEntryModel[];
  readonly expeditions: readonly AcademyExpeditionEntryModel[];
  readonly expeditionSlotCapacity: number;
}

export type AcademyResearchActionResult =
  | { readonly ok: true; readonly action: "research_started"; readonly activeResearch: ActiveResearchState }
  | Extract<StartResearchResult, { readonly ok: false }>;

export interface AcademyPresentationFoundationDependencies<
  TResearchRequirement extends ResearchRequirementDefinition,
  TExpeditionRequirement extends ExpeditionRequirementDefinition,
  TExpeditionRewardSummary,
> {
  readonly researchService: ResearchService<TResearchRequirement>;
  readonly expeditionService: ExpeditionService<TExpeditionRequirement, TExpeditionRewardSummary>;
  readonly onMutation?: () => void;
}

export function createAcademyPresentationFoundation<
  TResearchRequirement extends ResearchRequirementDefinition,
  TExpeditionRequirement extends ExpeditionRequirementDefinition,
  TExpeditionRewardSummary,
>(
  dependencies: AcademyPresentationFoundationDependencies<
    TResearchRequirement,
    TExpeditionRequirement,
    TExpeditionRewardSummary
  >,
) {
  const getModel = (): AcademyPresentationModel => {
    const activeResearches = dependencies.researchService.getActiveResearches();
    const activeById = new Map(activeResearches.map((entry) => [entry.researchId, entry]));
    const activeExpeditions = dependencies.expeditionService.getActiveExpeditions();

    return {
      research: dependencies.researchService.getDefinitions().map((definition) => {
        const active = activeById.get(definition.id);
        return {
          id: definition.id,
          displayName: definition.displayName,
          tier: definition.tier,
          state: dependencies.researchService.getEntryState(definition.id) ?? "locked",
          durationMs: definition.durationMs,
          remainingDurationMs: active?.remainingDurationMs,
          silverCost: definition.cost.silver,
          materials: definition.cost.materials.map((material) => ({ ...material })),
        };
      }),
      expeditions: dependencies.expeditionService.getDefinitions().map((definition) => {
        const active = activeExpeditions.find((entry) => entry.expeditionId === definition.id);
        return {
          id: definition.id,
          typeId: definition.typeId,
          displayName: definition.displayName,
          tier: definition.tier,
          active: active !== undefined,
          startState: dependencies.expeditionService.getStartState(definition.id) ?? "requirements_locked",
          activeSlotIndex: active?.slotIndex,
          activeDurationMs: active?.durationMs,
          remainingDurationMs: active?.remainingDurationMs,
          supportedDurationsMs: definition.supportedDurationsMs ?? EXPEDITION_DURATION_OPTIONS_MS,
        };
      }),
      expeditionSlotCapacity: dependencies.expeditionService.getSlotCapacity(),
    };
  };

  return {
    getModel,
    startResearch(this: void, researchId: string): AcademyResearchActionResult {
      const result = dependencies.researchService.startResearch(researchId);
      if (!result.ok) return result;
      dependencies.onMutation?.();
      return { ok: true, action: "research_started", activeResearch: result.activeResearch };
    },
    startExpedition(
      this: void,
      expeditionId: string,
      durationMs: ExpeditionDurationMs,
    ): StartExpeditionResult {
      const result = dependencies.expeditionService.startExpedition(expeditionId, durationMs);
      if (result.ok) dependencies.onMutation?.();
      return result;
    },
  };
}

export type AcademyPresentationFoundation = ReturnType<typeof createAcademyPresentationFoundation>;

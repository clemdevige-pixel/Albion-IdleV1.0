import {
  EXPEDITION_DURATION_OPTIONS_MS,
  type ExpeditionDurationMs,
  type ExpeditionRequirementDefinition,
  type ExpeditionService,
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
  readonly relicGateState: "none" | "waiting" | "ready" | "examined";
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
  readonly activeSlotIndex: number | undefined;
  readonly remainingDurationMs: number | undefined;
  readonly supportedDurationsMs: readonly ExpeditionDurationMs[];
}

export interface AcademyPresentationModel {
  readonly research: readonly AcademyResearchEntryModel[];
  readonly expeditions: readonly AcademyExpeditionEntryModel[];
}

export interface AcademyPresentationFoundationDependencies<
  TResearchRequirement extends ResearchRequirementDefinition,
  TExpeditionRequirement extends ExpeditionRequirementDefinition,
  TExpeditionRewardSummary,
> {
  readonly researchService: ResearchService<TResearchRequirement>;
  readonly expeditionService: ExpeditionService<TExpeditionRequirement, TExpeditionRewardSummary>;
  readonly getRelicGateState?: (
    researchId: string,
  ) => "none" | "waiting" | "ready" | "examined";
  readonly examineRelicForResearch?: (researchId: string) => boolean;
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
    const activeResearch = dependencies.researchService.getActiveResearch();
    const activeExpeditions = dependencies.expeditionService.getActiveExpeditions();

    return {
      research: dependencies.researchService.getDefinitions().map((definition) => ({
        id: definition.id,
        displayName: definition.displayName,
        tier: definition.tier,
        state: dependencies.researchService.getEntryState(definition.id) ?? "locked",
        relicGateState: dependencies.getRelicGateState?.(definition.id) ?? "none",
        durationMs: definition.durationMs,
        remainingDurationMs: activeResearch?.researchId === definition.id
          ? activeResearch.remainingDurationMs
          : undefined,
        silverCost: definition.cost.silver,
        materials: definition.cost.materials.map((material) => ({ ...material })),
      })),
      expeditions: dependencies.expeditionService.getDefinitions().map((definition) => {
        const active = activeExpeditions.find((entry) => entry.expeditionId === definition.id);
        return {
          id: definition.id,
          typeId: definition.typeId,
          displayName: definition.displayName,
          tier: definition.tier,
          active: active !== undefined,
          activeSlotIndex: active?.slotIndex,
          remainingDurationMs: active?.remainingDurationMs,
          supportedDurationsMs: definition.supportedDurationsMs ?? EXPEDITION_DURATION_OPTIONS_MS,
        };
      }),
    };
  };

  return {
    getModel,
    examineRelic(this: void, researchId: string): boolean {
      const examined = dependencies.examineRelicForResearch?.(researchId) ?? false;
      if (examined) dependencies.onMutation?.();
      return examined;
    },
    startResearch(this: void, researchId: string): StartResearchResult {
      const result = dependencies.researchService.startResearch(researchId);
      if (result.ok) dependencies.onMutation?.();
      return result;
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

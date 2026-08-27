import type { EntityId } from "@game/core";
import type {
  ExperienceService,
  GatheringCoordinator,
  GatheringManager,
  GatheringSessionId,
  GatheringToolDefinition,
  InventoryManager,
  MasteryId,
  MasteryService,
  ProgressionOrchestrator,
  ResourceFamily,
  ResourceNodeId,
} from "@game/gameplay";
import { asGatheringSessionId } from "@game/gameplay";
import {
  getProductionFamilyByGameplayFamily,
  getProductionTierRules,
  PRODUCTION_FAMILIES,
  requireProductionTierPresentation,
  type ProductionTier,
  type SupportedProductionFamily,
} from "../data/productionFamilyCatalog.js";
import {
  getHeroGatheringXpForTier,
  getRequiredGatheringMasteryForTier,
} from "../data/progressionContentCatalog.js";
import {
  applyActiveGatheringStrike,
  decayActiveGatheringActivity,
  getActiveGatheringBonuses,
  getActiveGatheringRewardedQuantity,
  getAverageActiveGatheringActivity,
  type ActiveGatheringYieldMultiplier,
  type GatheringStrikeQuality,
} from "./activeGatheringRewardRules.js";

export {
  getHeroGatheringXpForTier,
  getRequiredGatheringMasteryForTier,
} from "../data/progressionContentCatalog.js";

type SupportedGatheringFamily = SupportedProductionFamily;

const SUPPORTED_GATHERING_FAMILIES: readonly SupportedGatheringFamily[] =
  PRODUCTION_FAMILIES;

interface GatheringFamilyRuntime {
  readonly coordinator: GatheringCoordinator;
  readonly manager: GatheringManager;
  readonly masteryId: MasteryId;
  readonly getNodeId: (tier: ProductionTier) => ResourceNodeId;
  readonly getTool: (tier: ProductionTier) => GatheringToolDefinition;
  readonly getRawItemId: (tier: ProductionTier) => string;
}

interface MutableGatheringState {
  automatic: boolean;
  fractionalYieldCarry: number;
  miniGame: {
    sessionId: GatheringSessionId | null;
    strikesUsed: number;
    activity: number;
    activityTotal: number;
    activitySamples: number;
    lastProcessedTick: number | null;
    tier: ProductionTier | null;
  };
}

export interface ActiveGatheringMiniGameState {
  readonly sessionId: GatheringSessionId | null;
  readonly strikesUsed: number;
  readonly activity: number;
  readonly averageActivity: number;
  readonly yieldMultiplier: ActiveGatheringYieldMultiplier;
  readonly speedBonusRatio: 0 | 0.1 | 0.2 | 0.3;
  readonly nextActivityThreshold: number | null;
  readonly activityProgressToNext: number;
  readonly tier: ProductionTier | null;
}

export type ToggleGatheringResult =
  | { readonly action: "started"; readonly family: ResourceFamily }
  | { readonly action: "stopped"; readonly family: ResourceFamily }
  | { readonly action: "failed"; readonly family: ResourceFamily };

export type GatheringStrikeResult =
  | {
      readonly ok: true;
      readonly family: ResourceFamily;
      readonly strikesUsed: number;
      readonly activity: number;
      readonly yieldMultiplier: ActiveGatheringYieldMultiplier;
      readonly speedBonusRatio: 0 | 0.1 | 0.2 | 0.3;
    }
  | { readonly ok: false };

export interface GatheringCompletionEvent {
  readonly family: ResourceFamily;
  readonly added: boolean;
  readonly quantityAdded: number;
  readonly itemLabel: string;
  readonly completedTier: ProductionTier;
}

export interface GatheringTierContent {
  readonly nodeId: ResourceNodeId;
  readonly tool: GatheringToolDefinition;
  readonly rawItemId: string;
}

export type GatheringNodesAndTools = Readonly<
  Record<
    SupportedGatheringFamily,
    Readonly<Partial<Record<ProductionTier, GatheringTierContent>>>
  >
>;

export interface GatheringRuntimeDependencies {
  readonly gatheringFamilies: Readonly<
    Record<
      SupportedGatheringFamily,
      {
        readonly coordinator: GatheringCoordinator;
        readonly manager: GatheringManager;
      }
    >
  >;
  readonly inventoryManager: InventoryManager;
  readonly masteryService: MasteryService;
  readonly experienceService: ExperienceService;
  readonly progressionOrchestrator: ProgressionOrchestrator;
  /** @deprecated Production resources should use productionStorageId. */
  readonly heroId?: EntityId;
  readonly productionStorageId?: EntityId;
  readonly nodesAndTools: GatheringNodesAndTools;
  readonly getProductionTier: () => ProductionTier;
}

function isSupportedGatheringFamily(
  family: ResourceFamily,
): family is SupportedGatheringFamily {
  return SUPPORTED_GATHERING_FAMILIES.includes(
    family as SupportedGatheringFamily,
  );
}

function createEmptyMiniGameState(): MutableGatheringState["miniGame"] {
  return {
    sessionId: null,
    strikesUsed: 0,
    activity: 0,
    activityTotal: 0,
    activitySamples: 0,
    lastProcessedTick: null,
    tier: null,
  };
}

function createGatheringState(): MutableGatheringState {
  return {
    automatic: false,
    fractionalYieldCarry: 0,
    miniGame: createEmptyMiniGameState(),
  };
}

export class GatheringRuntime {
  private readonly inventoryManager: InventoryManager;
  private readonly masteryService: MasteryService;
  private readonly experienceService: ExperienceService;
  private readonly productionStorageId: EntityId;
  private readonly getProductionTier: () => ProductionTier;

  private readonly families: Readonly<
    Record<SupportedGatheringFamily, GatheringFamilyRuntime>
  >;

  private readonly states: Record<
    SupportedGatheringFamily,
    MutableGatheringState
  > = {
    Wood: createGatheringState(),
    Ore: createGatheringState(),
    Hide: createGatheringState(),
    Fiber: createGatheringState(),
  };

  private currentTickCounter = 0;

  private readonly completionListeners = new Set<
    (evt: GatheringCompletionEvent) => void
  >();

  public constructor(deps: GatheringRuntimeDependencies) {
    this.inventoryManager = deps.inventoryManager;
    this.masteryService = deps.masteryService;
    this.experienceService = deps.experienceService;
    this.getProductionTier = deps.getProductionTier;

    const storageId = deps.productionStorageId ?? deps.heroId;
    if (storageId === undefined) {
      throw new Error("GatheringRuntime requires production storage");
    }
    this.productionStorageId = storageId;

    const nodes = deps.nodesAndTools;
    const requireTierContent = (
      family: SupportedGatheringFamily,
      tier: ProductionTier,
    ): GatheringTierContent => {
      const content = nodes[family][tier];
      if (content === undefined) {
        throw new Error(
          `Gathering content missing for ${family} T${String(tier)}`,
        );
      }
      return content;
    };

    const familyEntries = SUPPORTED_GATHERING_FAMILIES.map((family) => {
      const catalogDefinition = getProductionFamilyByGameplayFamily(family);
      const runtimeDefinition: GatheringFamilyRuntime = {
        ...deps.gatheringFamilies[family],
        masteryId: catalogDefinition.masteryId,
        getNodeId: (tier) => requireTierContent(family, tier).nodeId,
        getTool: (tier) => requireTierContent(family, tier).tool,
        getRawItemId: (tier) => requireTierContent(family, tier).rawItemId,
      };
      return [family, runtimeDefinition] as const;
    });

    this.families = Object.fromEntries(
      familyEntries,
    ) as Record<SupportedGatheringFamily, GatheringFamilyRuntime>;

    this.states = Object.fromEntries(
      SUPPORTED_GATHERING_FAMILIES.map((family) => [family, createGatheringState()]),
    ) as Record<SupportedGatheringFamily, MutableGatheringState>;
    this.setupCompletedSubscriptions();
  }

  public subscribeGatherCompleted(
    listener: (evt: GatheringCompletionEvent) => void,
  ): () => void {
    this.completionListeners.add(listener);
    return () => {
      this.completionListeners.delete(listener);
    };
  }

  private notifyGatherCompleted(evt: GatheringCompletionEvent): void {
    for (const listener of this.completionListeners) listener(evt);
  }

  public getActiveMiniGameState(
    family: ResourceFamily,
  ): ActiveGatheringMiniGameState {
    if (!isSupportedGatheringFamily(family)) {
      return {
        sessionId: null,
        strikesUsed: 0,
        activity: 0,
        averageActivity: 0,
        yieldMultiplier: 1,
        speedBonusRatio: 0,
        nextActivityThreshold: 25,
        activityProgressToNext: 0,
        tier: null,
      };
    }

    const state = this.states[family].miniGame;
    const bonuses = getActiveGatheringBonuses(state.activity);
    return {
      sessionId: state.sessionId,
      strikesUsed: state.strikesUsed,
      activity: state.activity,
      averageActivity: getAverageActiveGatheringActivity(
        state.activityTotal,
        state.activitySamples,
      ),
      yieldMultiplier: bonuses.yieldMultiplier,
      speedBonusRatio: bonuses.speedBonusRatio,
      nextActivityThreshold: bonuses.nextActivityThreshold,
      activityProgressToNext: bonuses.progressToNext,
      tier: state.tier,
    };
  }

  public tick(tickCounter: number): void {
    this.currentTickCounter = tickCounter;

    for (const family of SUPPORTED_GATHERING_FAMILIES) {
      this.processActiveGatheringTicks(family, tickCounter);
      this.families[family].coordinator.tick(tickCounter);
    }
  }

  private processActiveGatheringTicks(
    family: SupportedGatheringFamily,
    tickCounter: number,
  ): void {
    const definition = this.families[family];
    const miniGame = this.states[family].miniGame;
    const session = definition.coordinator.getActiveSession();
    if (
      session === undefined
      || miniGame.sessionId === null
      || String(session.id) !== String(miniGame.sessionId)
    ) {
      return;
    }

    const previousTick = miniGame.lastProcessedTick ?? tickCounter;
    const elapsedTicks = Math.max(0, tickCounter - previousTick);
    if (elapsedTicks <= 0) return;

    for (let offset = 1; offset <= elapsedTicks; offset += 1) {
      const processingTick = previousTick + offset;
      const activeSession = definition.coordinator.getActiveSession();
      if (
        activeSession === undefined
        || miniGame.sessionId === null
        || String(activeSession.id) !== String(miniGame.sessionId)
      ) {
        return;
      }

      miniGame.activityTotal += miniGame.activity;
      miniGame.activitySamples += 1;

      const bonuses = getActiveGatheringBonuses(miniGame.activity);
      miniGame.activity = decayActiveGatheringActivity(
        miniGame.activity,
        activeSession.getRequiredTicks(),
        1,
      );
      miniGame.lastProcessedTick = processingTick;

      if (bonuses.speedBonusRatio > 0) {
        definition.coordinator.advanceActiveSession(
          bonuses.speedBonusRatio,
          processingTick,
        );
      }
    }
  }

  private beginActiveGatheringMiniGame(
    family: SupportedGatheringFamily,
    sessionId: GatheringSessionId,
    tier: ProductionTier,
    tickCounter: number,
  ): void {
    this.states[family].miniGame = {
      sessionId,
      strikesUsed: 0,
      activity: 0,
      activityTotal: 0,
      activitySamples: 0,
      lastProcessedTick: tickCounter,
      tier,
    };
  }

  private endActiveGatheringMiniGame(
    family: SupportedGatheringFamily,
  ): void {
    this.states[family].miniGame = createEmptyMiniGameState();
  }

  public getGatheringMasteryLevel(masteryId: MasteryId): number {
    return this.masteryService.getMasteryState(masteryId)?.level ?? 0;
  }

  public getHeroGatheringMasteryModifier(masteryId: MasteryId): number {
    return Math.max(
      0.5,
      1 - Math.min(100, this.getGatheringMasteryLevel(masteryId)) * 0.005,
    );
  }

  public getGatheringDurationTicks(masteryId: MasteryId): number {
    const tier = this.getProductionTier();
    const tierRules = getProductionTierRules(tier);
    return Math.max(
      1,
      Math.ceil(
        tierRules.gatheringBaseTicks
        * tierRules.gatheringToolSpeedModifier
        * this.getHeroGatheringMasteryModifier(masteryId),
      ),
    );
  }

  private awardGatheringMastery(
    masteryId: MasteryId,
    gatheredTier: ProductionTier = this.getProductionTier(),
  ): void {
    this.experienceService.addExperience(
      masteryId,
      getHeroGatheringXpForTier(gatheredTier),
      "gathering",
    );
  }

  private startGatheringCycle(
    family: SupportedGatheringFamily,
    cycleTier: ProductionTier = this.getProductionTier(),
    tickCounter: number = 0,
  ): boolean {
    const definition = this.families[family];
    if (
      this.getGatheringMasteryLevel(definition.masteryId)
      < getRequiredGatheringMasteryForTier(cycleTier)
    ) {
      return false;
    }

    const baseTool = definition.getTool(cycleTier);
    const tierRules = getProductionTierRules(cycleTier);
    const result = definition.coordinator.startGathering(
      definition.getNodeId(cycleTier),
      [
        {
          ...baseTool,
          speedModifier:
            baseTool.speedModifier
            * this.getHeroGatheringMasteryModifier(definition.masteryId),
        },
      ],
      tickCounter,
      tierRules.gatheringBaseTicks,
    );

    if (result.ok) {
      this.beginActiveGatheringMiniGame(
        family,
        asGatheringSessionId(result.sessionId),
        cycleTier,
        tickCounter,
      );
    }

    return result.ok;
  }

  private setupCompletedSubscriptions(): void {
    for (const family of SUPPORTED_GATHERING_FAMILIES) {
      const definition = this.families[family];
      definition.manager.events.subscribe(
        "gatherCompleted",
        ({ result }) => {
          this.completeGatheringCycle(family, result.quantityGathered);
        },
      );
    }
  }

  private completeGatheringCycle(
    family: SupportedGatheringFamily,
    quantityGathered: number,
  ): void {
    const state = this.states[family];
    const definition = this.families[family];
    const completedTier = state.miniGame.tier ?? this.getProductionTier();
    const averageActivity = getAverageActiveGatheringActivity(
      state.miniGame.activityTotal,
      state.miniGame.activitySamples,
    );
    const reward = getActiveGatheringRewardedQuantity(
      quantityGathered,
      averageActivity,
      state.fractionalYieldCarry,
    );
    state.fractionalYieldCarry = reward.fractionalCarry;
    const rewardedQuantity = reward.quantity;

    this.endActiveGatheringMiniGame(family);

    const rawItemId = definition.getRawItemId(completedTier);
    const added = this.inventoryManager.addQuantity(
      this.productionStorageId,
      rawItemId,
      rewardedQuantity,
      {
        itemId: rawItemId,
        stackable: true,
        maxStack: 999,
      },
    );

    if (added.ok) {
      this.awardGatheringMastery(definition.masteryId, completedTier);
    }

    if (
      state.automatic
      && !this.startGatheringCycle(
        family,
        completedTier,
        this.currentTickCounter,
      )
    ) {
      state.automatic = false;
    }

    const itemLabel = requireProductionTierPresentation(
      family,
      completedTier,
    ).resourceName;

    this.notifyGatherCompleted({
      family,
      added: added.ok,
      quantityAdded: added.ok ? added.value.added : 0,
      itemLabel,
      completedTier,
    });
  }

  public isHeroGathering(): boolean {
    return SUPPORTED_GATHERING_FAMILIES.some((family) => {
      const state = this.states[family];
      const coordinator = this.families[family].coordinator;
      return state.automatic || coordinator.getActiveSession() !== undefined;
    });
  }

  public stopAllGathering(): boolean {
    const wasGathering = this.isHeroGathering();
    for (const family of SUPPORTED_GATHERING_FAMILIES) {
      this.stopGatheringFamily(family);
    }
    return wasGathering;
  }

  private stopGatheringFamily(
    family: SupportedGatheringFamily,
  ): void {
    const state = this.states[family];
    const definition = this.families[family];
    state.automatic = false;

    const session = definition.coordinator.getActiveSession();
    if (session !== undefined) {
      definition.manager.interruptSession(session.id);
    }
    this.endActiveGatheringMiniGame(family);
  }

  private stopOtherGathering(
    exceptFamily?: SupportedGatheringFamily,
  ): void {
    for (const family of SUPPORTED_GATHERING_FAMILIES) {
      if (family !== exceptFamily) this.stopGatheringFamily(family);
    }
  }

  public toggleGatheringFamily(
    family: SupportedGatheringFamily,
    tickCounter: number = 0,
  ): ToggleGatheringResult {
    const state = this.states[family];
    if (state.automatic) {
      this.stopGatheringFamily(family);
      return { action: "stopped", family };
    }

    this.stopOtherGathering(family);
    state.automatic = true;

    if (!this.startGatheringCycle(family, this.getProductionTier(), tickCounter)) {
      state.automatic = false;
      return { action: "failed", family };
    }
    return { action: "started", family };
  }

  public performGatheringStrike(
    resourceFamily: ResourceFamily,
    quality: GatheringStrikeQuality,
    _tickCounter: number = 0,
  ): GatheringStrikeResult {
    if (!isSupportedGatheringFamily(resourceFamily)) {
      return { ok: false };
    }

    const state = this.states[resourceFamily];
    const definition = this.families[resourceFamily];
    const miniGame = state.miniGame;
    const session = definition.coordinator.getActiveSession();

    if (
      !state.automatic
      || session === undefined
      || miniGame.sessionId === null
      || String(session.id) !== String(miniGame.sessionId)
    ) {
      return { ok: false };
    }

    miniGame.strikesUsed += 1;
    miniGame.activity = applyActiveGatheringStrike(miniGame.activity, quality);
    const bonuses = getActiveGatheringBonuses(miniGame.activity);

    return {
      ok: true,
      family: resourceFamily,
      strikesUsed: miniGame.strikesUsed,
      activity: miniGame.activity,
      yieldMultiplier: bonuses.yieldMultiplier,
      speedBonusRatio: bonuses.speedBonusRatio,
    };
  }
}

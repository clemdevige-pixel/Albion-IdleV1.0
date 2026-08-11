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
  getClothRecipe,
  getLeatherRecipe,
  getMetalRecipe,
  getWoodRecipe,
} from "../data/refiningRecipes.js";
import { getProductionFamilyByGameplayFamily } from "../data/productionFamilyCatalog.js";
import {
  FIBER_GATHERING_MASTERY_ID,
  HIDE_GATHERING_MASTERY_ID,
  ORE_GATHERING_MASTERY_ID,
  WOOD_GATHERING_MASTERY_ID,
  getHeroGatheringXpForTier,
  getRequiredGatheringMasteryForTier,
} from "../data/progressionContentCatalog.js";

export {
  getHeroGatheringXpForTier,
  getRequiredGatheringMasteryForTier,
} from "../data/progressionContentCatalog.js";

const ACTIVE_GATHERING_PERFECT_BONUS_RATIO = 0.04;
const ACTIVE_GATHERING_CORRECT_BONUS_RATIO = 0.02;

type ProductionTier = 3 | 4;
type SupportedGatheringFamily = Extract<
  ResourceFamily,
  "Wood" | "Ore" | "Hide" | "Fiber"
>;

const SUPPORTED_GATHERING_FAMILIES: readonly SupportedGatheringFamily[] = [
  "Wood",
  "Ore",
  "Hide",
  "Fiber",
];

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
  miniGame: {
    sessionId: GatheringSessionId | null;
    strikesUsed: number;
    tier: ProductionTier | null;
  };
}

export interface ActiveGatheringMiniGameState {
  readonly sessionId: GatheringSessionId | null;
  readonly strikesUsed: number;
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
    }
  | { readonly ok: false };

export interface GatheringCompletionEvent {
  readonly family: ResourceFamily;
  readonly added: boolean;
  readonly quantityAdded: number;
  readonly itemLabel: string;
  readonly completedTier: ProductionTier;
}

export interface GatheringNodesAndTools {
  readonly birchNodeId: ResourceNodeId;
  readonly pineNodeId: ResourceNodeId;
  readonly copperNodeId: ResourceNodeId;
  readonly ironNodeId: ResourceNodeId;
  readonly sturdyHideNodeId: ResourceNodeId;
  readonly thickHideNodeId: ResourceNodeId;
  readonly linenFiberNodeId: ResourceNodeId;
  readonly fineFiberNodeId: ResourceNodeId;

  readonly starterAxe: GatheringToolDefinition;
  readonly tier4Axe: GatheringToolDefinition;
  readonly starterPickaxe: GatheringToolDefinition;
  readonly tier4Pickaxe: GatheringToolDefinition;
  readonly starterSkinningKnife: GatheringToolDefinition;
  readonly tier4SkinningKnife: GatheringToolDefinition;
  readonly starterSickle: GatheringToolDefinition;
  readonly tier4Sickle: GatheringToolDefinition;
}

export interface GatheringRuntimeDependencies {
  readonly gatheringCoordinator: GatheringCoordinator;
  readonly gatheringManager: GatheringManager;
  readonly oreGatheringCoordinator: GatheringCoordinator;
  readonly oreGatheringManager: GatheringManager;
  readonly hideGatheringCoordinator: GatheringCoordinator;
  readonly hideGatheringManager: GatheringManager;
  readonly fiberGatheringCoordinator: GatheringCoordinator;
  readonly fiberGatheringManager: GatheringManager;

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
    Wood: {
      automatic: false,
      miniGame: { sessionId: null, strikesUsed: 0, tier: null },
    },
    Ore: {
      automatic: false,
      miniGame: { sessionId: null, strikesUsed: 0, tier: null },
    },
    Hide: {
      automatic: false,
      miniGame: { sessionId: null, strikesUsed: 0, tier: null },
    },
    Fiber: {
      automatic: false,
      miniGame: { sessionId: null, strikesUsed: 0, tier: null },
    },
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

    this.families = {
      Wood: {
        coordinator: deps.gatheringCoordinator,
        manager: deps.gatheringManager,
        masteryId: WOOD_GATHERING_MASTERY_ID,
        getNodeId: (tier) =>
          tier === 4 ? nodes.pineNodeId : nodes.birchNodeId,
        getTool: (tier) =>
          tier === 4 ? nodes.tier4Axe : nodes.starterAxe,
        getRawItemId: (tier) => getWoodRecipe(tier).rawItemId,
      },
      Ore: {
        coordinator: deps.oreGatheringCoordinator,
        manager: deps.oreGatheringManager,
        masteryId: ORE_GATHERING_MASTERY_ID,
        getNodeId: (tier) =>
          tier === 4 ? nodes.ironNodeId : nodes.copperNodeId,
        getTool: (tier) =>
          tier === 4 ? nodes.tier4Pickaxe : nodes.starterPickaxe,
        getRawItemId: (tier) => getMetalRecipe(tier).rawItemId,
      },
      Hide: {
        coordinator: deps.hideGatheringCoordinator,
        manager: deps.hideGatheringManager,
        masteryId: HIDE_GATHERING_MASTERY_ID,
        getNodeId: (tier) =>
          tier === 4 ? nodes.thickHideNodeId : nodes.sturdyHideNodeId,
        getTool: (tier) =>
          tier === 4
            ? nodes.tier4SkinningKnife
            : nodes.starterSkinningKnife,
        getRawItemId: (tier) => getLeatherRecipe(tier).rawItemId,
      },
      Fiber: {
        coordinator: deps.fiberGatheringCoordinator,
        manager: deps.fiberGatheringManager,
        masteryId: FIBER_GATHERING_MASTERY_ID,
        getNodeId: (tier) =>
          tier === 4 ? nodes.fineFiberNodeId : nodes.linenFiberNodeId,
        getTool: (tier) =>
          tier === 4 ? nodes.tier4Sickle : nodes.starterSickle,
        getRawItemId: (tier) => getClothRecipe(tier).rawItemId,
      },
    };

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
    for (const listener of this.completionListeners) {
      listener(evt);
    }
  }

  public getActiveMiniGameState(
    family: ResourceFamily,
  ): ActiveGatheringMiniGameState {
    if (!isSupportedGatheringFamily(family)) {
      return { sessionId: null, strikesUsed: 0, tier: null };
    }

    const state = this.states[family].miniGame;
    return {
      sessionId: state.sessionId,
      strikesUsed: state.strikesUsed,
      tier: state.tier,
    };
  }

  public tick(tickCounter: number): void {
    this.currentTickCounter = tickCounter;

    for (const family of SUPPORTED_GATHERING_FAMILIES) {
      this.families[family].coordinator.tick(tickCounter);
    }
  }

  private beginActiveGatheringMiniGame(
    family: SupportedGatheringFamily,
    sessionId: GatheringSessionId,
    tier: ProductionTier,
  ): void {
    this.states[family].miniGame = {
      sessionId,
      strikesUsed: 0,
      tier,
    };
  }

  private endActiveGatheringMiniGame(
    family: SupportedGatheringFamily,
  ): void {
    this.states[family].miniGame = {
      sessionId: null,
      strikesUsed: 0,
      tier: null,
    };
  }

  public getGatheringMasteryLevel(masteryId: MasteryId): number {
    return this.masteryService.getMasteryState(masteryId)?.level ?? 0;
  }

  public getHeroGatheringMasteryModifier(masteryId: MasteryId): number {
    return Math.max(
      0.5,
      1 -
        Math.min(100, this.getGatheringMasteryLevel(masteryId)) * 0.005,
    );
  }

  public getGatheringDurationTicks(masteryId: MasteryId): number {
    const tier = this.getProductionTier();
    const baseTicks = tier === 4 ? 36 : 24;
    const toolModifier = tier === 4 ? 0.85 : 1;

    return Math.max(
      1,
      Math.ceil(
        baseTicks *
          toolModifier *
          this.getHeroGatheringMasteryModifier(masteryId),
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
      this.getGatheringMasteryLevel(definition.masteryId) <
      getRequiredGatheringMasteryForTier(cycleTier)
    ) {
      return false;
    }

    const baseTool = definition.getTool(cycleTier);
    const result = definition.coordinator.startGathering(
      definition.getNodeId(cycleTier),
      [
        {
          ...baseTool,
          speedModifier:
            baseTool.speedModifier *
            this.getHeroGatheringMasteryModifier(definition.masteryId),
        },
      ],
      tickCounter,
    );

    if (result.ok) {
      this.beginActiveGatheringMiniGame(
        family,
        asGatheringSessionId(result.sessionId),
        cycleTier,
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
          this.completeGatheringCycle(
            family,
            result.quantityGathered,
          );
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

    const completedTier =
      state.miniGame.tier ?? this.getProductionTier();

    this.endActiveGatheringMiniGame(family);

    const rawItemId = definition.getRawItemId(completedTier);

    const added = this.inventoryManager.addQuantity(
      this.productionStorageId,
      rawItemId,
      quantityGathered,
      {
        itemId: rawItemId,
        stackable: true,
        maxStack: 999,
      },
    );

    if (added.ok) {
      this.awardGatheringMastery(
        definition.masteryId,
        completedTier,
      );
    }

    if (
      state.automatic &&
      !this.startGatheringCycle(
        family,
        completedTier,
        this.currentTickCounter,
      )
    ) {
      state.automatic = false;
    }

    const itemLabel =
      getProductionFamilyByGameplayFamily(family)
        .tiers[completedTier].resourceName;

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

      return (
        state.automatic ||
        coordinator.getActiveSession() !== undefined
      );
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
      if (family !== exceptFamily) {
        this.stopGatheringFamily(family);
      }
    }
  }

  private toggleGatheringFamily(
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

    if (
      !this.startGatheringCycle(
        family,
        this.getProductionTier(),
        tickCounter,
      )
    ) {
      state.automatic = false;
      return { action: "failed", family };
    }

    return { action: "started", family };
  }

  public toggleGathering(
    tickCounter: number = 0,
  ): ToggleGatheringResult {
    return this.toggleGatheringFamily("Wood", tickCounter);
  }

  public toggleOreGathering(
    tickCounter: number = 0,
  ): ToggleGatheringResult {
    return this.toggleGatheringFamily("Ore", tickCounter);
  }

  public toggleHideGathering(
    tickCounter: number = 0,
  ): ToggleGatheringResult {
    return this.toggleGatheringFamily("Hide", tickCounter);
  }

  public toggleFiberGathering(
    tickCounter: number = 0,
  ): ToggleGatheringResult {
    return this.toggleGatheringFamily("Fiber", tickCounter);
  }

  public performGatheringStrike(
    resourceFamily: ResourceFamily,
    quality: "miss" | "correct" | "perfect",
    tickCounter: number = 0,
  ): GatheringStrikeResult {
    if (!isSupportedGatheringFamily(resourceFamily)) {
      return { ok: false };
    }

    const state = this.states[resourceFamily];
    const definition = this.families[resourceFamily];
    const miniGame = state.miniGame;
    const session = definition.coordinator.getActiveSession();

    if (
      !state.automatic ||
      session === undefined ||
      miniGame.sessionId === null ||
      String(session.id) !== String(miniGame.sessionId)
    ) {
      return { ok: false };
    }

    miniGame.strikesUsed += 1;

    if (quality !== "miss") {
      const ratio =
        quality === "perfect"
          ? ACTIVE_GATHERING_PERFECT_BONUS_RATIO
          : ACTIVE_GATHERING_CORRECT_BONUS_RATIO;

      const bonusTicks = session.getRequiredTicks() * ratio;

      definition.coordinator.advanceActiveSession(
        bonusTicks,
        tickCounter,
      );
    }

    return {
      ok: true,
      family: resourceFamily,
      strikesUsed: miniGame.strikesUsed,
    };
  }
}
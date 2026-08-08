import type { EntityId } from "@game/core";
import type {
  GatheringCoordinator,
  GatheringManager,
  GatheringSessionId,
  GatheringToolDefinition,
  InventoryManager,
  MasteryService,
  ExperienceService,
  ProgressionOrchestrator,
  ResourceFamily,
  ResourceNodeId,
  MasteryId,
} from "@game/gameplay";
import {
  asMasteryId,
  asGatheringSessionId,
} from "@game/gameplay";
import {
  BIRCH_PLANK_RECIPE,
  COPPER_BAR_RECIPE,
  PINE_PLANK_RECIPE,
  IRON_BAR_RECIPE,
  STURDY_LEATHER_RECIPE,
  LINEN_CLOTH_RECIPE,
  THICK_LEATHER_RECIPE,
  FINE_CLOTH_RECIPE,
} from "../data/refiningRecipes.js";

const WOOD_GATHERING_MASTERY_ID = asMasteryId("mastery_gathering_wood");
const ORE_GATHERING_MASTERY_ID = asMasteryId("mastery_gathering_ore");
const HIDE_GATHERING_MASTERY_ID = asMasteryId("mastery_gathering_hide");
const FIBER_GATHERING_MASTERY_ID = asMasteryId("mastery_gathering_fiber");

const ACTIVE_GATHERING_PERFECT_BONUS_RATIO = 0.04;
const ACTIVE_GATHERING_CORRECT_BONUS_RATIO = 0.02;

export function getHeroGatheringXpForTier(tier: number): number {
  return Math.max(1, Math.round(5 * (1.6 ** Math.max(0, tier - 3))));
}

export function getRequiredGatheringMasteryForTier(tier: number): number {
  if (
    typeof window !== "undefined"
    && new URLSearchParams(window.location.search).get("productionTest") === "1"
  ) {
    return 0;
  }
  return Math.max(0, tier - 3) * 3;
}

export interface ActiveGatheringMiniGameState {
  readonly sessionId: GatheringSessionId | null;
  readonly strikesUsed: number;
  readonly tier: 3 | 4 | null;
}

export type ToggleGatheringResult =
  | { readonly action: "started"; readonly family: ResourceFamily }
  | { readonly action: "stopped"; readonly family: ResourceFamily }
  | { readonly action: "failed"; readonly family: ResourceFamily };

export type GatheringStrikeResult =
  | { readonly ok: true; readonly family: ResourceFamily; readonly strikesUsed: number }
  | { readonly ok: false };

export interface GatheringCompletionEvent {
  readonly family: ResourceFamily;
  readonly added: boolean;
  readonly quantityAdded: number;
  readonly itemLabel: string;
  readonly completedTier: 3 | 4;
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
  readonly heroId: EntityId;

  readonly nodesAndTools: GatheringNodesAndTools;
  readonly getProductionTier: () => 3 | 4;
}

export class GatheringRuntime {
  private readonly gatheringCoordinator: GatheringCoordinator;
  private readonly gatheringManager: GatheringManager;
  private readonly oreGatheringCoordinator: GatheringCoordinator;
  private readonly oreGatheringManager: GatheringManager;
  private readonly hideGatheringCoordinator: GatheringCoordinator;
  private readonly hideGatheringManager: GatheringManager;
  private readonly fiberGatheringCoordinator: GatheringCoordinator;
  private readonly fiberGatheringManager: GatheringManager;

  private readonly inventoryManager: InventoryManager;
  private readonly masteryService: MasteryService;
  private readonly experienceService: ExperienceService;
  private readonly heroId: EntityId;
  private readonly nodesAndTools: GatheringNodesAndTools;
  private readonly getProductionTier: () => 3 | 4;

  private readonly activeGatheringMiniGames: Record<ResourceFamily, {
    sessionId: GatheringSessionId | null;
    strikesUsed: number;
    tier: 3 | 4 | null;
  }> = {
    Wood: { sessionId: null, strikesUsed: 0, tier: null },
    Ore: { sessionId: null, strikesUsed: 0, tier: null },
    Hide: { sessionId: null, strikesUsed: 0, tier: null },
    Fiber: { sessionId: null, strikesUsed: 0, tier: null },
    Stone: { sessionId: null, strikesUsed: 0, tier: null },
  };

  private automaticGathering = false;
  private automaticOreGathering = false;
  private automaticHideGathering = false;
  private automaticFiberGathering = false;
  private currentTickCounter = 0;

  private readonly completionListeners = new Set<(evt: GatheringCompletionEvent) => void>();

  public constructor(deps: GatheringRuntimeDependencies) {
    this.gatheringCoordinator = deps.gatheringCoordinator;
    this.gatheringManager = deps.gatheringManager;
    this.oreGatheringCoordinator = deps.oreGatheringCoordinator;
    this.oreGatheringManager = deps.oreGatheringManager;
    this.hideGatheringCoordinator = deps.hideGatheringCoordinator;
    this.hideGatheringManager = deps.hideGatheringManager;
    this.fiberGatheringCoordinator = deps.fiberGatheringCoordinator;
    this.fiberGatheringManager = deps.fiberGatheringManager;

    this.inventoryManager = deps.inventoryManager;
    this.masteryService = deps.masteryService;
    this.experienceService = deps.experienceService;
    this.heroId = deps.heroId;
    this.nodesAndTools = deps.nodesAndTools;
    this.getProductionTier = deps.getProductionTier;

    this.setupCompletedSubscriptions();
  }

  public subscribeGatherCompleted(listener: (evt: GatheringCompletionEvent) => void): () => void {
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

  public getActiveMiniGameState(family: ResourceFamily): ActiveGatheringMiniGameState {
    const state = this.activeGatheringMiniGames[family];
    return {
      sessionId: state.sessionId,
      strikesUsed: state.strikesUsed,
      tier: state.tier,
    };
  }

  public tick(tickCounter: number): void {
    this.currentTickCounter = tickCounter;
    this.gatheringCoordinator.tick(tickCounter);
    this.oreGatheringCoordinator.tick(tickCounter);
    this.hideGatheringCoordinator.tick(tickCounter);
    this.fiberGatheringCoordinator.tick(tickCounter);
  }

  private beginActiveGatheringMiniGame(
    resourceFamily: ResourceFamily,
    sessionId: GatheringSessionId,
    tier: 3 | 4,
  ): void {
    this.activeGatheringMiniGames[resourceFamily] = { sessionId, strikesUsed: 0, tier };
  }

  private endActiveGatheringMiniGame(resourceFamily: ResourceFamily): void {
    this.activeGatheringMiniGames[resourceFamily] = { sessionId: null, strikesUsed: 0, tier: null };
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
    const baseTicks = tier === 4 ? 36 : 24;
    const toolModifier = tier === 4 ? 0.85 : 1;
    return Math.max(
      1,
      Math.ceil(baseTicks * toolModifier * this.getHeroGatheringMasteryModifier(masteryId)),
    );
  }

  private getWoodRecipe(tier: 3 | 4 = this.getProductionTier()) {
    return tier === 4 ? PINE_PLANK_RECIPE : BIRCH_PLANK_RECIPE;
  }

  private getMetalRecipe(tier: 3 | 4 = this.getProductionTier()) {
    return tier === 4 ? IRON_BAR_RECIPE : COPPER_BAR_RECIPE;
  }

  private getLeatherRecipe(tier: 3 | 4 = this.getProductionTier()) {
    return tier === 4 ? THICK_LEATHER_RECIPE : STURDY_LEATHER_RECIPE;
  }

  private getClothRecipe(tier: 3 | 4 = this.getProductionTier()) {
    return tier === 4 ? FINE_CLOTH_RECIPE : LINEN_CLOTH_RECIPE;
  }

  private awardGatheringMastery(
    masteryId: ReturnType<typeof asMasteryId>,
    gatheredTier: 3 | 4 = this.getProductionTier(),
  ): void {
    this.experienceService.addExperience(
      masteryId,
      getHeroGatheringXpForTier(gatheredTier),
      "gathering",
    );
  }

  private startGatheringCycle(cycleTier: 3 | 4 = this.getProductionTier(), tickCounter: number = 0): boolean {
    if (
      this.getGatheringMasteryLevel(WOOD_GATHERING_MASTERY_ID)
      < getRequiredGatheringMasteryForTier(cycleTier)
    ) {
      return false;
    }
    const baseTool = cycleTier === 4 ? this.nodesAndTools.tier4Axe : this.nodesAndTools.starterAxe;
    const result = this.gatheringCoordinator.startGathering(
      cycleTier === 4 ? this.nodesAndTools.pineNodeId : this.nodesAndTools.birchNodeId,
      [{
        ...baseTool,
        speedModifier:
          baseTool.speedModifier * this.getHeroGatheringMasteryModifier(WOOD_GATHERING_MASTERY_ID),
      }],
      tickCounter,
    );
    if (result.ok) {
      this.beginActiveGatheringMiniGame("Wood", asGatheringSessionId(result.sessionId), cycleTier);
    }
    return result.ok;
  }

  private startOreGatheringCycle(cycleTier: 3 | 4 = this.getProductionTier(), tickCounter: number = 0): boolean {
    if (
      this.getGatheringMasteryLevel(ORE_GATHERING_MASTERY_ID)
      < getRequiredGatheringMasteryForTier(cycleTier)
    ) {
      return false;
    }
    const baseTool = cycleTier === 4 ? this.nodesAndTools.tier4Pickaxe : this.nodesAndTools.starterPickaxe;
    const result = this.oreGatheringCoordinator.startGathering(
      cycleTier === 4 ? this.nodesAndTools.ironNodeId : this.nodesAndTools.copperNodeId,
      [{
        ...baseTool,
        speedModifier:
          baseTool.speedModifier * this.getHeroGatheringMasteryModifier(ORE_GATHERING_MASTERY_ID),
      }],
      tickCounter,
    );
    if (result.ok) this.beginActiveGatheringMiniGame("Ore", asGatheringSessionId(result.sessionId), cycleTier);
    return result.ok;
  }

  private startHideGatheringCycle(cycleTier: 3 | 4 = this.getProductionTier(), tickCounter: number = 0): boolean {
    if (
      this.getGatheringMasteryLevel(HIDE_GATHERING_MASTERY_ID)
      < getRequiredGatheringMasteryForTier(cycleTier)
    ) {
      return false;
    }
    const baseTool = cycleTier === 4 ? this.nodesAndTools.tier4SkinningKnife : this.nodesAndTools.starterSkinningKnife;
    const result = this.hideGatheringCoordinator.startGathering(
      cycleTier === 4 ? this.nodesAndTools.thickHideNodeId : this.nodesAndTools.sturdyHideNodeId,
      [{
        ...baseTool,
        speedModifier:
          baseTool.speedModifier * this.getHeroGatheringMasteryModifier(HIDE_GATHERING_MASTERY_ID),
      }],
      tickCounter,
    );
    if (result.ok) this.beginActiveGatheringMiniGame("Hide", asGatheringSessionId(result.sessionId), cycleTier);
    return result.ok;
  }

  private startFiberGatheringCycle(cycleTier: 3 | 4 = this.getProductionTier(), tickCounter: number = 0): boolean {
    if (
      this.getGatheringMasteryLevel(FIBER_GATHERING_MASTERY_ID)
      < getRequiredGatheringMasteryForTier(cycleTier)
    ) {
      return false;
    }
    const baseTool = cycleTier === 4 ? this.nodesAndTools.tier4Sickle : this.nodesAndTools.starterSickle;
    const result = this.fiberGatheringCoordinator.startGathering(
      cycleTier === 4 ? this.nodesAndTools.fineFiberNodeId : this.nodesAndTools.linenFiberNodeId,
      [{
        ...baseTool,
        speedModifier:
          baseTool.speedModifier * this.getHeroGatheringMasteryModifier(FIBER_GATHERING_MASTERY_ID),
      }],
      tickCounter,
    );
    if (result.ok) this.beginActiveGatheringMiniGame("Fiber", asGatheringSessionId(result.sessionId), cycleTier);
    return result.ok;
  }

  private setupCompletedSubscriptions(): void {
    this.gatheringManager.events.subscribe("gatherCompleted", ({ result }) => {
      const completedTier = this.activeGatheringMiniGames["Wood"]?.tier ?? this.getProductionTier();
      this.endActiveGatheringMiniGame("Wood");
      const recipe = this.getWoodRecipe(completedTier);
      const added = this.inventoryManager.addQuantity(
        this.heroId,
        recipe.rawItemId,
        result.quantityGathered,
        { itemId: recipe.rawItemId, stackable: true, maxStack: 999 },
      );
      if (added.ok) {
        this.awardGatheringMastery(WOOD_GATHERING_MASTERY_ID, completedTier);
      }
      if (this.automaticGathering && !this.startGatheringCycle(completedTier, this.currentTickCounter)) {
        this.automaticGathering = false;
      }
      const itemLabel = completedTier === 4 ? "Bois de pin" : "Bois de bouleau";
      this.notifyGatherCompleted({
        family: "Wood",
        added: added.ok,
        quantityAdded: added.ok ? added.value.added : 0,
        itemLabel,
        completedTier,
      });
    });

    this.oreGatheringManager.events.subscribe("gatherCompleted", ({ result }) => {
      const completedTier = this.activeGatheringMiniGames["Ore"]?.tier ?? this.getProductionTier();
      this.endActiveGatheringMiniGame("Ore");
      const recipe = this.getMetalRecipe(completedTier);
      const added = this.inventoryManager.addQuantity(
        this.heroId,
        recipe.rawItemId,
        result.quantityGathered,
        { itemId: recipe.rawItemId, stackable: true, maxStack: 999 },
      );
      if (added.ok) {
        this.awardGatheringMastery(ORE_GATHERING_MASTERY_ID, completedTier);
      }
      if (this.automaticOreGathering && !this.startOreGatheringCycle(completedTier, this.currentTickCounter)) {
        this.automaticOreGathering = false;
      }
      const itemLabel = completedTier === 4 ? "Minerai de fer" : "Minerai de cuivre";
      this.notifyGatherCompleted({
        family: "Ore",
        added: added.ok,
        quantityAdded: added.ok ? added.value.added : 0,
        itemLabel,
        completedTier,
      });
    });

    this.hideGatheringManager.events.subscribe("gatherCompleted", ({ result }) => {
      const completedTier = this.activeGatheringMiniGames["Hide"]?.tier ?? this.getProductionTier();
      this.endActiveGatheringMiniGame("Hide");
      const recipe = this.getLeatherRecipe(completedTier);
      const added = this.inventoryManager.addQuantity(
        this.heroId,
        recipe.rawItemId,
        result.quantityGathered,
        { itemId: recipe.rawItemId, stackable: true, maxStack: 999 },
      );
      if (added.ok) {
        this.awardGatheringMastery(HIDE_GATHERING_MASTERY_ID, completedTier);
      }
      if (this.automaticHideGathering && !this.startHideGatheringCycle(completedTier, this.currentTickCounter)) {
        this.automaticHideGathering = false;
      }
      const itemLabel = completedTier === 4 ? "Peau épaisse" : "Peau robuste";
      this.notifyGatherCompleted({
        family: "Hide",
        added: added.ok,
        quantityAdded: added.ok ? added.value.added : 0,
        itemLabel,
        completedTier,
      });
    });

    this.fiberGatheringManager.events.subscribe("gatherCompleted", ({ result }) => {
      const completedTier = this.activeGatheringMiniGames["Fiber"]?.tier ?? this.getProductionTier();
      this.endActiveGatheringMiniGame("Fiber");
      const recipe = this.getClothRecipe(completedTier);
      const added = this.inventoryManager.addQuantity(
        this.heroId,
        recipe.rawItemId,
        result.quantityGathered,
        { itemId: recipe.rawItemId, stackable: true, maxStack: 999 },
      );
      if (added.ok) {
        this.awardGatheringMastery(FIBER_GATHERING_MASTERY_ID, completedTier);
      }
      if (this.automaticFiberGathering && !this.startFiberGatheringCycle(completedTier, this.currentTickCounter)) {
        this.automaticFiberGathering = false;
      }
      const itemLabel = completedTier === 4 ? "Fibre fine" : "Fibre de lin";
      this.notifyGatherCompleted({
        family: "Fiber",
        added: added.ok,
        quantityAdded: added.ok ? added.value.added : 0,
        itemLabel,
        completedTier,
      });
    });
  }

  public isHeroGathering(): boolean {
    return (
      this.automaticGathering
      || this.automaticOreGathering
      || this.automaticHideGathering
      || this.automaticFiberGathering
      || this.gatheringCoordinator.getActiveSession() !== undefined
      || this.oreGatheringCoordinator.getActiveSession() !== undefined
      || this.hideGatheringCoordinator.getActiveSession() !== undefined
      || this.fiberGatheringCoordinator.getActiveSession() !== undefined
    );
  }

  public stopAllGathering(): boolean {
    const wasGathering = this.isHeroGathering();

    this.automaticGathering = false;
    this.automaticOreGathering = false;
    this.automaticHideGathering = false;
    this.automaticFiberGathering = false;

    const woodSession = this.gatheringCoordinator.getActiveSession();
    if (woodSession !== undefined) this.gatheringManager.interruptSession(woodSession.id);
    const oreSession = this.oreGatheringCoordinator.getActiveSession();
    if (oreSession !== undefined) this.oreGatheringManager.interruptSession(oreSession.id);
    const hideSession = this.hideGatheringCoordinator.getActiveSession();
    if (hideSession !== undefined) this.hideGatheringManager.interruptSession(hideSession.id);
    const fiberSession = this.fiberGatheringCoordinator.getActiveSession();
    if (fiberSession !== undefined) this.fiberGatheringManager.interruptSession(fiberSession.id);

    this.endActiveGatheringMiniGame("Wood");
    this.endActiveGatheringMiniGame("Ore");
    this.endActiveGatheringMiniGame("Hide");
    this.endActiveGatheringMiniGame("Fiber");

    return wasGathering;
  }

  private stopOtherGathering(exceptFamily?: ResourceFamily): void {
    if (exceptFamily !== "Wood") {
      this.automaticGathering = false;
      const session = this.gatheringCoordinator.getActiveSession();
      if (session !== undefined) this.gatheringManager.interruptSession(session.id);
      this.endActiveGatheringMiniGame("Wood");
    }
    if (exceptFamily !== "Ore") {
      this.automaticOreGathering = false;
      const session = this.oreGatheringCoordinator.getActiveSession();
      if (session !== undefined) this.oreGatheringManager.interruptSession(session.id);
      this.endActiveGatheringMiniGame("Ore");
    }
    if (exceptFamily !== "Hide") {
      this.automaticHideGathering = false;
      const session = this.hideGatheringCoordinator.getActiveSession();
      if (session !== undefined) this.hideGatheringManager.interruptSession(session.id);
      this.endActiveGatheringMiniGame("Hide");
    }
    if (exceptFamily !== "Fiber") {
      this.automaticFiberGathering = false;
      const session = this.fiberGatheringCoordinator.getActiveSession();
      if (session !== undefined) this.fiberGatheringManager.interruptSession(session.id);
      this.endActiveGatheringMiniGame("Fiber");
    }
  }

  public toggleGathering(tickCounter: number = 0): ToggleGatheringResult {
    if (this.automaticGathering) {
      this.automaticGathering = false;
      const session = this.gatheringCoordinator.getActiveSession();
      if (session !== undefined) {
        this.gatheringManager.interruptSession(session.id);
      }
      this.endActiveGatheringMiniGame("Wood");
      return { action: "stopped", family: "Wood" };
    }

    this.stopOtherGathering("Wood");

    this.automaticGathering = true;
    if (!this.startGatheringCycle(this.getProductionTier(), tickCounter)) {
      this.automaticGathering = false;
      return { action: "failed", family: "Wood" };
    }
    return { action: "started", family: "Wood" };
  }

  public toggleOreGathering(tickCounter: number = 0): ToggleGatheringResult {
    if (this.automaticOreGathering) {
      this.automaticOreGathering = false;
      const session = this.oreGatheringCoordinator.getActiveSession();
      if (session !== undefined) this.oreGatheringManager.interruptSession(session.id);
      this.endActiveGatheringMiniGame("Ore");
      return { action: "stopped", family: "Ore" };
    }

    this.stopOtherGathering("Ore");

    this.automaticOreGathering = true;
    if (!this.startOreGatheringCycle(this.getProductionTier(), tickCounter)) {
      this.automaticOreGathering = false;
      return { action: "failed", family: "Ore" };
    }
    return { action: "started", family: "Ore" };
  }

  public toggleHideGathering(tickCounter: number = 0): ToggleGatheringResult {
    if (this.automaticHideGathering) {
      this.automaticHideGathering = false;
      const session = this.hideGatheringCoordinator.getActiveSession();
      if (session !== undefined) this.hideGatheringManager.interruptSession(session.id);
      this.endActiveGatheringMiniGame("Hide");
      return { action: "stopped", family: "Hide" };
    }

    this.stopOtherGathering("Hide");

    this.automaticHideGathering = true;
    if (!this.startHideGatheringCycle(this.getProductionTier(), tickCounter)) {
      this.automaticHideGathering = false;
      return { action: "failed", family: "Hide" };
    }
    return { action: "started", family: "Hide" };
  }

  public toggleFiberGathering(tickCounter: number = 0): ToggleGatheringResult {
    if (this.automaticFiberGathering) {
      this.automaticFiberGathering = false;
      const session = this.fiberGatheringCoordinator.getActiveSession();
      if (session !== undefined) this.fiberGatheringManager.interruptSession(session.id);
      this.endActiveGatheringMiniGame("Fiber");
      return { action: "stopped", family: "Fiber" };
    }

    this.stopOtherGathering("Fiber");

    this.automaticFiberGathering = true;
    if (!this.startFiberGatheringCycle(this.getProductionTier(), tickCounter)) {
      this.automaticFiberGathering = false;
      return { action: "failed", family: "Fiber" };
    }
    return { action: "started", family: "Fiber" };
  }

  public performGatheringStrike(
    resourceFamily: ResourceFamily,
    quality: "miss" | "correct" | "perfect",
    tickCounter: number = 0,
  ): GatheringStrikeResult {
    const coordinator = resourceFamily === "Wood"
      ? this.gatheringCoordinator
      : resourceFamily === "Ore"
        ? this.oreGatheringCoordinator
        : resourceFamily === "Hide"
          ? this.hideGatheringCoordinator
          : resourceFamily === "Fiber"
            ? this.fiberGatheringCoordinator
            : undefined;
    const isAutomatic = resourceFamily === "Wood"
      ? this.automaticGathering
      : resourceFamily === "Ore"
        ? this.automaticOreGathering
        : resourceFamily === "Hide"
          ? this.automaticHideGathering
          : resourceFamily === "Fiber"
            ? this.automaticFiberGathering
            : false;
    const miniGame = this.activeGatheringMiniGames[resourceFamily];
    const session = coordinator?.getActiveSession();
    if (
      !isAutomatic
      || coordinator === undefined
      || miniGame === undefined
      || session === undefined
      || String(session.id) !== miniGame.sessionId
    ) {
      return { ok: false };
    }

    miniGame.strikesUsed += 1;
    if (quality !== "miss") {
      const ratio = quality === "perfect"
        ? ACTIVE_GATHERING_PERFECT_BONUS_RATIO
        : ACTIVE_GATHERING_CORRECT_BONUS_RATIO;
      const bonusTicks = session.getRequiredTicks() * ratio;
      coordinator.advanceActiveSession(bonusTicks, tickCounter);
    }
    return { ok: true, family: resourceFamily, strikesUsed: miniGame.strikesUsed };
  }
}

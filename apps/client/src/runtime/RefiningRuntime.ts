import type { EntityId } from "@game/core";
import type { SaveProvider } from "@game/persistence";
import type {
  InventoryManager,
  RefiningManager,
  ResourceFamily,
} from "@game/gameplay";
import {
  asRecipeId,
  asCraftStationId,
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

export interface ReservedRefiningRequirement {
  readonly itemId: string;
  readonly quantity: number;
}

export type ToggleRefiningResult =
  | { readonly action: "started"; readonly family: ResourceFamily }
  | { readonly action: "stopped"; readonly family: ResourceFamily }
  | { readonly action: "failed"; readonly family: ResourceFamily };

export interface RefiningCompletionEvent {
  readonly family: ResourceFamily;
  readonly added: boolean;
  readonly outputItemId: string;
  readonly outputQuantity: number;
}

export interface RefiningRuntimeDependencies {
  readonly refiningManager: RefiningManager;
  readonly metalRefiningManager: RefiningManager;
  readonly leatherRefiningManager: RefiningManager;
  readonly clothRefiningManager: RefiningManager;

  readonly inventoryManager: InventoryManager;
  /** @deprecated Production resources should use productionStorageId. */
  readonly heroId?: EntityId;
  readonly productionStorageId?: EntityId;

  readonly getProductionTier: () => 3 | 4;
}

type WoodRecipe = typeof BIRCH_PLANK_RECIPE | typeof PINE_PLANK_RECIPE;
type MetalRecipe = typeof COPPER_BAR_RECIPE | typeof IRON_BAR_RECIPE;
type LeatherRecipe = typeof STURDY_LEATHER_RECIPE | typeof THICK_LEATHER_RECIPE;
type ClothRecipe = typeof LINEN_CLOTH_RECIPE | typeof FINE_CLOTH_RECIPE;

export class RefiningRuntime {
  private readonly refiningManager: RefiningManager;
  private readonly metalRefiningManager: RefiningManager;
  private readonly leatherRefiningManager: RefiningManager;
  private readonly clothRefiningManager: RefiningManager;

  private readonly inventoryManager: InventoryManager;
  private readonly productionStorageId: EntityId;
  private readonly getProductionTier: () => 3 | 4;

  private automaticRefining = false;
  private reservedRefiningInputs: readonly ReservedRefiningRequirement[] = [];
  private activeWoodRefiningRecipe: WoodRecipe | undefined;

  private automaticMetalRefining = false;
  private reservedMetalInputs: readonly ReservedRefiningRequirement[] = [];
  private activeMetalRefiningRecipe: MetalRecipe | undefined;

  private automaticLeatherRefining = false;
  private reservedLeatherInputs: readonly ReservedRefiningRequirement[] = [];
  private activeLeatherRefiningRecipe: LeatherRecipe | undefined;

  private automaticClothRefining = false;
  private reservedClothInputs: readonly ReservedRefiningRequirement[] = [];
  private activeClothRefiningRecipe: ClothRecipe | undefined;
  private currentTickCounter = 0;

  private readonly completionListeners = new Set<(evt: RefiningCompletionEvent) => void>();

  public constructor(deps: RefiningRuntimeDependencies) {
    this.refiningManager = deps.refiningManager;
    this.metalRefiningManager = deps.metalRefiningManager;
    this.leatherRefiningManager = deps.leatherRefiningManager;
    this.clothRefiningManager = deps.clothRefiningManager;

    this.inventoryManager = deps.inventoryManager;
    const storageId = deps.productionStorageId ?? deps.heroId;
    if (storageId === undefined) throw new Error("RefiningRuntime requires production storage");
    this.productionStorageId = storageId;
    this.getProductionTier = deps.getProductionTier;

    this.setupCompletedSubscriptions();
  }

  public subscribeRefineCompleted(listener: (evt: RefiningCompletionEvent) => void): () => void {
    this.completionListeners.add(listener);
    return () => {
      this.completionListeners.delete(listener);
    };
  }

  private notifyRefineCompleted(evt: RefiningCompletionEvent): void {
    for (const listener of this.completionListeners) {
      listener(evt);
    }
  }

  public tick(tickCounter: number): void {
    this.currentTickCounter = tickCounter;
    this.refiningManager.tick(tickCounter);
    this.metalRefiningManager.tick(tickCounter);
    this.leatherRefiningManager.tick(tickCounter);
    this.clothRefiningManager.tick(tickCounter);
  }

  public getReservedInputs(family: ResourceFamily): readonly ReservedRefiningRequirement[] {
    if (family === "Wood") return this.reservedRefiningInputs;
    if (family === "Ore") return this.reservedMetalInputs;
    if (family === "Hide") return this.reservedLeatherInputs;
    if (family === "Fiber") return this.reservedClothInputs;
    return [];
  }

  public getAllReservedInputs(): readonly ReservedRefiningRequirement[] {
    return [
      ...this.reservedRefiningInputs,
      ...this.reservedMetalInputs,
      ...this.reservedLeatherInputs,
      ...this.reservedClothInputs,
    ];
  }

  public isRefiningActive(family: ResourceFamily): boolean {
    if (family === "Wood") return this.refiningManager.getActiveSession() !== undefined;
    if (family === "Ore") return this.metalRefiningManager.getActiveSession() !== undefined;
    if (family === "Hide") return this.leatherRefiningManager.getActiveSession() !== undefined;
    if (family === "Fiber") return this.clothRefiningManager.getActiveSession() !== undefined;
    return false;
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

  private reserveRefiningRequirements(
    requirements: readonly ReservedRefiningRequirement[],
  ): readonly ReservedRefiningRequirement[] | undefined {
    const canPay = requirements.every((requirement) =>
      this.inventoryManager.getTotalQuantity(this.productionStorageId, requirement.itemId) >= requirement.quantity);
    if (!canPay) return undefined;

    const reserved: ReservedRefiningRequirement[] = [];
    for (const requirement of requirements) {
      const removed = this.inventoryManager.removeQuantity(
        this.productionStorageId,
        requirement.itemId,
        requirement.quantity,
      );
      if (!removed.ok) {
        for (const entry of reserved) {
          this.inventoryManager.addQuantity(this.productionStorageId, entry.itemId, entry.quantity, {
            itemId: entry.itemId,
            stackable: true,
            maxStack: 999,
          });
        }
        return undefined;
      }
      reserved.push(requirement);
    }
    return reserved;
  }

  private refundRefiningRequirements(
    requirements: readonly ReservedRefiningRequirement[],
  ): void {
    for (const requirement of requirements) {
      this.inventoryManager.addQuantity(this.productionStorageId, requirement.itemId, requirement.quantity, {
        itemId: requirement.itemId,
        stackable: true,
        maxStack: 999,
      });
    }
  }

  private startRefiningCycle(
    recipe = this.getWoodRecipe(),
    tickCounter: number = 0,
  ): boolean {
    const reserved = this.reserveRefiningRequirements(recipe.requirements);
    if (reserved === undefined) return false;
    this.reservedRefiningInputs = reserved;
    this.activeWoodRefiningRecipe = recipe;
    const started = this.refiningManager.startRefining(
      {
        recipeId: asRecipeId(recipe.id),
        stationId: asCraftStationId(recipe.stationId),
        quantity: recipe.outputQuantity,
      },
      { baseRefineTicks: recipe.durationTicks, speedModifier: 1 },
      tickCounter,
    );
    if (!started.ok) {
      this.refundRefiningRequirements(this.reservedRefiningInputs);
      this.reservedRefiningInputs = [];
      this.activeWoodRefiningRecipe = undefined;
      return false;
    }
    return true;
  }

  private startMetalRefiningCycle(
    recipe = this.getMetalRecipe(),
    tickCounter: number = 0,
  ): boolean {
    const reserved = this.reserveRefiningRequirements(recipe.requirements);
    if (reserved === undefined) return false;
    this.reservedMetalInputs = reserved;
    this.activeMetalRefiningRecipe = recipe;
    const started = this.metalRefiningManager.startRefining(
      {
        recipeId: asRecipeId(recipe.id),
        stationId: asCraftStationId(recipe.stationId),
        quantity: recipe.outputQuantity,
      },
      { baseRefineTicks: recipe.durationTicks, speedModifier: 1 },
      tickCounter,
    );
    if (!started.ok) {
      this.refundRefiningRequirements(this.reservedMetalInputs);
      this.reservedMetalInputs = [];
      this.activeMetalRefiningRecipe = undefined;
      return false;
    }
    return true;
  }

  private startLeatherRefiningCycle(
    recipe = this.getLeatherRecipe(),
    tickCounter: number = 0,
  ): boolean {
    const reserved = this.reserveRefiningRequirements(recipe.requirements);
    if (reserved === undefined) return false;
    this.reservedLeatherInputs = reserved;
    this.activeLeatherRefiningRecipe = recipe;
    const started = this.leatherRefiningManager.startRefining(
      {
        recipeId: asRecipeId(recipe.id),
        stationId: asCraftStationId(recipe.stationId),
        quantity: recipe.outputQuantity,
      },
      { baseRefineTicks: recipe.durationTicks, speedModifier: 1 },
      tickCounter,
    );
    if (!started.ok) {
      this.refundRefiningRequirements(this.reservedLeatherInputs);
      this.reservedLeatherInputs = [];
      this.activeLeatherRefiningRecipe = undefined;
      return false;
    }
    return true;
  }

  private startClothRefiningCycle(
    recipe = this.getClothRecipe(),
    tickCounter: number = 0,
  ): boolean {
    const reserved = this.reserveRefiningRequirements(recipe.requirements);
    if (reserved === undefined) return false;
    this.reservedClothInputs = reserved;
    this.activeClothRefiningRecipe = recipe;
    const started = this.clothRefiningManager.startRefining(
      {
        recipeId: asRecipeId(recipe.id),
        stationId: asCraftStationId(recipe.stationId),
        quantity: recipe.outputQuantity,
      },
      { baseRefineTicks: recipe.durationTicks, speedModifier: 1 },
      tickCounter,
    );
    if (!started.ok) {
      this.refundRefiningRequirements(this.reservedClothInputs);
      this.reservedClothInputs = [];
      this.activeClothRefiningRecipe = undefined;
      return false;
    }
    return true;
  }

  private setupCompletedSubscriptions(): void {
    this.refiningManager.events.subscribe("refine:completed", () => {
      const recipe = this.activeWoodRefiningRecipe ?? this.getWoodRecipe();
      const added = this.inventoryManager.addQuantity(
        this.productionStorageId,
        recipe.outputItemId,
        recipe.outputQuantity,
        { itemId: recipe.outputItemId, stackable: true, maxStack: 999 },
      );
      if (!added.ok) {
        this.refundRefiningRequirements(this.reservedRefiningInputs);
        this.automaticRefining = false;
        this.activeWoodRefiningRecipe = undefined;
        this.reservedRefiningInputs = [];
        this.refiningManager.clear();
      } else {
        this.reservedRefiningInputs = [];
        this.refiningManager.clear();
        if (this.automaticRefining && !this.startRefiningCycle(recipe, this.currentTickCounter)) {
          this.automaticRefining = false;
          this.activeWoodRefiningRecipe = undefined;
        } else if (!this.automaticRefining) {
          this.activeWoodRefiningRecipe = undefined;
        }
      }
      this.notifyRefineCompleted({
        family: "Wood",
        added: added.ok,
        outputItemId: recipe.outputItemId,
        outputQuantity: recipe.outputQuantity,
      });
    });

    this.metalRefiningManager.events.subscribe("refine:completed", () => {
      const recipe = this.activeMetalRefiningRecipe ?? this.getMetalRecipe();
      const added = this.inventoryManager.addQuantity(
        this.productionStorageId,
        recipe.outputItemId,
        recipe.outputQuantity,
        { itemId: recipe.outputItemId, stackable: true, maxStack: 999 },
      );
      if (!added.ok) {
        this.refundRefiningRequirements(this.reservedMetalInputs);
        this.automaticMetalRefining = false;
        this.activeMetalRefiningRecipe = undefined;
        this.reservedMetalInputs = [];
        this.metalRefiningManager.clear();
      } else {
        this.reservedMetalInputs = [];
        this.metalRefiningManager.clear();
        if (this.automaticMetalRefining && !this.startMetalRefiningCycle(recipe, this.currentTickCounter)) {
          this.automaticMetalRefining = false;
          this.activeMetalRefiningRecipe = undefined;
        } else if (!this.automaticMetalRefining) {
          this.activeMetalRefiningRecipe = undefined;
        }
      }
      this.notifyRefineCompleted({
        family: "Ore",
        added: added.ok,
        outputItemId: recipe.outputItemId,
        outputQuantity: recipe.outputQuantity,
      });
    });

    this.leatherRefiningManager.events.subscribe("refine:completed", () => {
      const recipe = this.activeLeatherRefiningRecipe ?? this.getLeatherRecipe();
      const added = this.inventoryManager.addQuantity(
        this.productionStorageId,
        recipe.outputItemId,
        recipe.outputQuantity,
        { itemId: recipe.outputItemId, stackable: true, maxStack: 999 },
      );
      if (!added.ok) {
        this.refundRefiningRequirements(this.reservedLeatherInputs);
        this.automaticLeatherRefining = false;
        this.activeLeatherRefiningRecipe = undefined;
        this.reservedLeatherInputs = [];
        this.leatherRefiningManager.clear();
      } else {
        this.reservedLeatherInputs = [];
        this.leatherRefiningManager.clear();
        if (this.automaticLeatherRefining && !this.startLeatherRefiningCycle(recipe, this.currentTickCounter)) {
          this.automaticLeatherRefining = false;
          this.activeLeatherRefiningRecipe = undefined;
        } else if (!this.automaticLeatherRefining) {
          this.activeLeatherRefiningRecipe = undefined;
        }
      }
      this.notifyRefineCompleted({
        family: "Hide",
        added: added.ok,
        outputItemId: recipe.outputItemId,
        outputQuantity: recipe.outputQuantity,
      });
    });

    this.clothRefiningManager.events.subscribe("refine:completed", () => {
      const recipe = this.activeClothRefiningRecipe ?? this.getClothRecipe();
      const added = this.inventoryManager.addQuantity(
        this.productionStorageId,
        recipe.outputItemId,
        recipe.outputQuantity,
        { itemId: recipe.outputItemId, stackable: true, maxStack: 999 },
      );
      if (!added.ok) {
        this.refundRefiningRequirements(this.reservedClothInputs);
        this.automaticClothRefining = false;
        this.activeClothRefiningRecipe = undefined;
        this.reservedClothInputs = [];
        this.clothRefiningManager.clear();
      } else {
        this.reservedClothInputs = [];
        this.clothRefiningManager.clear();
        if (this.automaticClothRefining && !this.startClothRefiningCycle(recipe, this.currentTickCounter)) {
          this.automaticClothRefining = false;
          this.activeClothRefiningRecipe = undefined;
        } else if (!this.automaticClothRefining) {
          this.activeClothRefiningRecipe = undefined;
        }
      }
      this.notifyRefineCompleted({
        family: "Fiber",
        added: added.ok,
        outputItemId: recipe.outputItemId,
        outputQuantity: recipe.outputQuantity,
      });
    });
  }

  public toggleRefining(tickCounter: number = 0): ToggleRefiningResult {
    if (this.automaticRefining) {
      this.automaticRefining = false;
      const session = this.refiningManager.getActiveSession();
      if (session !== undefined) {
        this.refiningManager.cancelSession(session.id);
        this.refundRefiningRequirements(this.reservedRefiningInputs);
        this.reservedRefiningInputs = [];
        this.activeWoodRefiningRecipe = undefined;
        this.refiningManager.clear();
      }
      return { action: "stopped", family: "Wood" };
    }

    this.automaticRefining = true;
    if (!this.startRefiningCycle(this.getWoodRecipe(), tickCounter)) {
      this.automaticRefining = false;
      return { action: "failed", family: "Wood" };
    }
    return { action: "started", family: "Wood" };
  }

  public toggleMetalRefining(tickCounter: number = 0): ToggleRefiningResult {
    if (this.automaticMetalRefining) {
      this.automaticMetalRefining = false;
      const session = this.metalRefiningManager.getActiveSession();
      if (session !== undefined) {
        this.metalRefiningManager.cancelSession(session.id);
        this.refundRefiningRequirements(this.reservedMetalInputs);
        this.reservedMetalInputs = [];
        this.activeMetalRefiningRecipe = undefined;
        this.metalRefiningManager.clear();
      }
      return { action: "stopped", family: "Ore" };
    }

    this.automaticMetalRefining = true;
    if (!this.startMetalRefiningCycle(this.getMetalRecipe(), tickCounter)) {
      this.automaticMetalRefining = false;
      return { action: "failed", family: "Ore" };
    }
    return { action: "started", family: "Ore" };
  }

  public toggleLeatherRefining(tickCounter: number = 0): ToggleRefiningResult {
    if (this.automaticLeatherRefining) {
      this.automaticLeatherRefining = false;
      const session = this.leatherRefiningManager.getActiveSession();
      if (session !== undefined) {
        this.leatherRefiningManager.cancelSession(session.id);
        this.refundRefiningRequirements(this.reservedLeatherInputs);
        this.reservedLeatherInputs = [];
        this.activeLeatherRefiningRecipe = undefined;
        this.leatherRefiningManager.clear();
      }
      return { action: "stopped", family: "Hide" };
    }

    this.automaticLeatherRefining = true;
    if (!this.startLeatherRefiningCycle(this.getLeatherRecipe(), tickCounter)) {
      this.automaticLeatherRefining = false;
      return { action: "failed", family: "Hide" };
    }
    return { action: "started", family: "Hide" };
  }

  public toggleClothRefining(tickCounter: number = 0): ToggleRefiningResult {
    if (this.automaticClothRefining) {
      this.automaticClothRefining = false;
      const session = this.clothRefiningManager.getActiveSession();
      if (session !== undefined) {
        this.clothRefiningManager.cancelSession(session.id);
        this.refundRefiningRequirements(this.reservedClothInputs);
        this.reservedClothInputs = [];
        this.activeClothRefiningRecipe = undefined;
        this.clothRefiningManager.clear();
      }
      return { action: "stopped", family: "Fiber" };
    }

    this.automaticClothRefining = true;
    if (!this.startClothRefiningCycle(this.getClothRecipe(), tickCounter)) {
      this.automaticClothRefining = false;
      return { action: "failed", family: "Fiber" };
    }
    return { action: "started", family: "Fiber" };
  }

  public refineAllAvailable(tickCounter: number = 0): { readonly startedAtLeastOne: boolean } {
    const refiningLines = [
      { manager: this.refiningManager, toggle: () => this.toggleRefining(tickCounter) },
      { manager: this.metalRefiningManager, toggle: () => this.toggleMetalRefining(tickCounter) },
      { manager: this.leatherRefiningManager, toggle: () => this.toggleLeatherRefining(tickCounter) },
      { manager: this.clothRefiningManager, toggle: () => this.toggleClothRefining(tickCounter) },
    ] as const;
    let startedAtLeastOne = false;
    for (const line of refiningLines) {
      if (line.manager.getActiveSession() !== undefined) continue;
      if (line.toggle().action === "started") startedAtLeastOne = true;
    }
    return { startedAtLeastOne };
  }
}

export interface SavedRefiningRecoveryPayload {
  readonly reservedInputs: readonly ReservedRefiningRequirement[];
}

export class RefiningSaveProvider implements SaveProvider {
  readonly providerId = "refining";

  constructor(
    private readonly refiningRuntime: RefiningRuntime,
    private readonly inventoryManager: InventoryManager,
    private readonly getProductionStorageId: () => EntityId,
  ) {}

  save(): unknown {
    const reservedInputs = this.refiningRuntime.getAllReservedInputs();
    return { reservedInputs } satisfies SavedRefiningRecoveryPayload;
  }

  load(data: unknown): void {
    const payload = data as SavedRefiningRecoveryPayload | undefined;
    if (!payload || !Array.isArray(payload.reservedInputs) || payload.reservedInputs.length === 0) {
      return;
    }

    const productionStorageId = this.getProductionStorageId();
    for (const input of payload.reservedInputs) {
      this.inventoryManager.addQuantity(productionStorageId, input.itemId, input.quantity, {
        itemId: input.itemId,
        stackable: true,
        maxStack: 999,
      });
    }
  }
}

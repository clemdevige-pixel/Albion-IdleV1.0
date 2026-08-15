import type { EntityId } from "@game/core";
import type { SaveProvider } from "@game/persistence";
import type {
  InventoryManager,
  RefiningManager,
  ResourceFamily,
} from "@game/gameplay";
import {
  asCraftStationId,
  asRecipeId,
} from "@game/gameplay";
import {
  getProductionRefiningRecipe,
  type ProductionRefiningRecipe,
} from "../data/refiningRecipes.js";
import {
  getProductionFamilyId,
  PRODUCTION_FAMILIES,
  type ProductionFamilyId,
  type ProductionTier,
  type SupportedProductionFamily,
} from "../data/productionFamilyCatalog.js";

type SupportedRefiningFamily = SupportedProductionFamily;

export interface ReservedRefiningRequirement {
  readonly itemId: string;
  readonly quantity: number;
}

export type ToggleRefiningResult =
  | { readonly action: "started"; readonly family: ResourceFamily }
  | { readonly action: "stopped"; readonly family: ResourceFamily }
  | { readonly action: "failed"; readonly family: ResourceFamily };

const SUPPORTED_REFINING_FAMILIES: readonly SupportedRefiningFamily[] =
  PRODUCTION_FAMILIES;

export interface RefiningCompletionEvent {
  readonly family: ResourceFamily;
  readonly added: boolean;
  readonly outputItemId: string;
  readonly outputQuantity: number;
}

export interface RefiningRuntimeDependencies {
  readonly refiningManagers: Readonly<
    Record<SupportedRefiningFamily, RefiningManager>
  >;
  readonly inventoryManager: InventoryManager;
  /** @deprecated Production resources should use productionStorageId. */
  readonly heroId?: EntityId;
  readonly productionStorageId?: EntityId;
  readonly getProductionTier: (family: SupportedRefiningFamily) => ProductionTier;
}

interface RefiningFamilyRuntimeDefinition {
  readonly manager: RefiningManager;
  readonly productionFamilyId: ProductionFamilyId;
}

interface RefiningFamilyState {
  automatic: boolean;
  reservedInputs: readonly ReservedRefiningRequirement[];
  activeRecipe: ProductionRefiningRecipe | undefined;
}

function isSupportedRefiningFamily(
  family: ResourceFamily,
): family is SupportedRefiningFamily {
  return SUPPORTED_REFINING_FAMILIES.includes(
    family as SupportedRefiningFamily,
  );
}

export class RefiningRuntime {
  private readonly inventoryManager: InventoryManager;
  private readonly productionStorageId: EntityId;
  private readonly getProductionTier: (family: SupportedRefiningFamily) => ProductionTier;
  private readonly families: Readonly<
    Record<SupportedRefiningFamily, RefiningFamilyRuntimeDefinition>
  >;
  private readonly states: Record<
    SupportedRefiningFamily,
    RefiningFamilyState
  >;
  private currentTickCounter = 0;
  private readonly completionListeners = new Set<
    (evt: RefiningCompletionEvent) => void
  >();

  public constructor(deps: RefiningRuntimeDependencies) {
    this.inventoryManager = deps.inventoryManager;
    this.getProductionTier = deps.getProductionTier;

    const storageId = deps.productionStorageId ?? deps.heroId;
    if (storageId === undefined) {
      throw new Error("RefiningRuntime requires production storage");
    }
    this.productionStorageId = storageId;

    this.families = Object.fromEntries(
      SUPPORTED_REFINING_FAMILIES.map((family) => [
        family,
        {
          manager: deps.refiningManagers[family],
          productionFamilyId: getProductionFamilyId(family),
        },
      ]),
    ) as Record<
      SupportedRefiningFamily,
      RefiningFamilyRuntimeDefinition
    >;

    this.states = Object.fromEntries(
      SUPPORTED_REFINING_FAMILIES.map((family) => [
        family,
        {
          automatic: false,
          reservedInputs: [],
          activeRecipe: undefined,
        },
      ]),
    ) as unknown as Record<SupportedRefiningFamily, RefiningFamilyState>;
    this.setupCompletedSubscriptions();
  }

  public subscribeRefineCompleted(
    listener: (evt: RefiningCompletionEvent) => void,
  ): () => void {
    this.completionListeners.add(listener);
    return () => {
      this.completionListeners.delete(listener);
    };
  }

  private notifyRefineCompleted(evt: RefiningCompletionEvent): void {
    for (const listener of this.completionListeners) listener(evt);
  }

  public tick(tickCounter: number): void {
    this.currentTickCounter = tickCounter;
    for (const family of SUPPORTED_REFINING_FAMILIES) {
      const definition = this.families[family];
      definition.manager.tick(tickCounter);

      const state = this.states[family];
      if (state.automatic && definition.manager.getActiveSession() === undefined) {
        this.startRefiningCycle(family, this.getRecipe(family), tickCounter);
      }
    }
  }

  public getReservedInputs(
    family: ResourceFamily,
  ): readonly ReservedRefiningRequirement[] {
    if (!isSupportedRefiningFamily(family)) return [];
    return this.states[family].reservedInputs;
  }

  public getAllReservedInputs(): readonly ReservedRefiningRequirement[] {
    return SUPPORTED_REFINING_FAMILIES.flatMap(
      (family) => this.states[family].reservedInputs,
    );
  }

  public isRefiningActive(family: ResourceFamily): boolean {
    if (!isSupportedRefiningFamily(family)) return false;
    return this.families[family].manager.getActiveSession() !== undefined;
  }

  public isAutomaticEnabled(family: ResourceFamily): boolean {
    if (!isSupportedRefiningFamily(family)) return false;
    return this.states[family].automatic;
  }

  /**
   * Persistence load replaces the authoritative production-storage snapshot.
   * Any live sessions belong to the pre-load timeline and must therefore be
   * discarded without refunding their in-memory reservations into the restored
   * inventory. The save provider will restore the saved reservations exactly once.
   */
  public resetForPersistenceLoad(): void {
    for (const family of SUPPORTED_REFINING_FAMILIES) {
      const state = this.states[family];
      state.automatic = false;
      state.reservedInputs = [];
      state.activeRecipe = undefined;
      this.families[family].manager.clear();
    }
  }

  private getRecipe(
    family: SupportedRefiningFamily,
    tier: ProductionTier = this.getProductionTier(family),
  ): ProductionRefiningRecipe {
    return getProductionRefiningRecipe(
      this.families[family].productionFamilyId,
      tier,
    );
  }

  private reserveRefiningRequirements(
    requirements: readonly ReservedRefiningRequirement[],
  ): readonly ReservedRefiningRequirement[] | undefined {
    const canPay = requirements.every(
      (requirement) =>
        this.inventoryManager.getTotalQuantity(
          this.productionStorageId,
          requirement.itemId,
        ) >= requirement.quantity,
    );
    if (!canPay) return undefined;

    const reserved: ReservedRefiningRequirement[] = [];
    for (const requirement of requirements) {
      const removed = this.inventoryManager.removeQuantity(
        this.productionStorageId,
        requirement.itemId,
        requirement.quantity,
      );
      if (!removed.ok) {
        this.refundRefiningRequirements(reserved);
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
      this.inventoryManager.addQuantity(
        this.productionStorageId,
        requirement.itemId,
        requirement.quantity,
        {
          itemId: requirement.itemId,
          stackable: true,
          maxStack: 999,
        },
      );
    }
  }

  private startRefiningCycle(
    family: SupportedRefiningFamily,
    recipe: ProductionRefiningRecipe = this.getRecipe(family),
    tickCounter: number = 0,
  ): boolean {
    const definition = this.families[family];
    const state = this.states[family];
    if (definition.manager.getActiveSession() !== undefined) return false;

    const reserved = this.reserveRefiningRequirements(recipe.requirements);
    if (reserved === undefined) return false;

    state.reservedInputs = reserved;
    state.activeRecipe = recipe;

    const started = definition.manager.startRefining(
      {
        recipeId: asRecipeId(recipe.id),
        stationId: asCraftStationId(recipe.stationId),
        quantity: recipe.outputQuantity,
      },
      {
        baseRefineTicks: recipe.durationTicks,
        speedModifier: 1,
      },
      tickCounter,
    );

    if (!started.ok) {
      this.refundRefiningRequirements(state.reservedInputs);
      state.reservedInputs = [];
      state.activeRecipe = undefined;
      return false;
    }
    return true;
  }

  private setupCompletedSubscriptions(): void {
    for (const family of SUPPORTED_REFINING_FAMILIES) {
      this.families[family].manager.events.subscribe(
        "refine:completed",
        () => {
          this.completeRefiningCycle(family);
        },
      );
    }
  }

  private completeRefiningCycle(
    family: SupportedRefiningFamily,
  ): void {
    const definition = this.families[family];
    const state = this.states[family];
    const recipe = state.activeRecipe ?? this.getRecipe(family);

    const added = this.inventoryManager.addQuantity(
      this.productionStorageId,
      recipe.outputItemId,
      recipe.outputQuantity,
      {
        itemId: recipe.outputItemId,
        stackable: true,
        maxStack: 999,
      },
    );

    if (!added.ok) {
      this.refundRefiningRequirements(state.reservedInputs);
      state.automatic = false;
      state.activeRecipe = undefined;
      state.reservedInputs = [];
      definition.manager.clear();
    } else {
      state.reservedInputs = [];
      definition.manager.clear();
      if (state.automatic) {
        if (!this.startRefiningCycle(family, recipe, this.currentTickCounter)) {
          // Automatic refining remains armed while waiting for the worker or
          // active gathering to replenish the shared production storage.
          state.activeRecipe = undefined;
        }
      } else {
        state.activeRecipe = undefined;
      }
    }

    this.notifyRefineCompleted({
      family,
      added: added.ok,
      outputItemId: recipe.outputItemId,
      outputQuantity: recipe.outputQuantity,
    });
  }

  private stopRefiningFamily(
    family: SupportedRefiningFamily,
  ): void {
    const definition = this.families[family];
    const state = this.states[family];
    state.automatic = false;
    const session = definition.manager.getActiveSession();

    if (session !== undefined) {
      definition.manager.cancelSession(session.id);
      this.refundRefiningRequirements(state.reservedInputs);
    }

    state.reservedInputs = [];
    state.activeRecipe = undefined;
    definition.manager.clear();
  }

  public toggleRefiningFamily(
    family: SupportedRefiningFamily,
    tickCounter: number = 0,
  ): ToggleRefiningResult {
    const state = this.states[family];
    if (state.automatic) {
      this.stopRefiningFamily(family);
      return { action: "stopped", family };
    }

    state.automatic = true;
    if (!this.startRefiningCycle(family, this.getRecipe(family), tickCounter)) {
      state.automatic = false;
      return { action: "failed", family };
    }
    return { action: "started", family };
  }
}

export interface SavedRefiningRecoveryPayload {
  readonly reservedInputs: readonly ReservedRefiningRequirement[];
}

function isReservedRefiningRequirement(
  value: unknown,
): value is ReservedRefiningRequirement {
  if (value === null || typeof value !== "object") return false;
  const candidate = value as Record<string, unknown>;
  return (
    typeof candidate.itemId === "string" &&
    typeof candidate.quantity === "number" &&
    Number.isInteger(candidate.quantity) &&
    candidate.quantity > 0
  );
}

export class RefiningSaveProvider implements SaveProvider {
  readonly providerId = "refining";

  constructor(
    private readonly refiningRuntime: RefiningRuntime,
    private readonly inventoryManager: InventoryManager,
    private readonly getProductionStorageId: () => EntityId,
  ) {}

  save(): unknown {
    return {
      reservedInputs: this.refiningRuntime.getAllReservedInputs(),
    } satisfies SavedRefiningRecoveryPayload;
  }

  load(data: unknown): void {
    // Loading into an already-running GameProvider must first discard the live
    // pre-load sessions. Do not refund them: the authoritative inventory has
    // already been replaced by the persistence snapshot at this point.
    this.refiningRuntime.resetForPersistenceLoad();

    if (
      data === null ||
      typeof data !== "object" ||
      !("reservedInputs" in data)
    ) return;

    const rawReservedInputs: unknown = data.reservedInputs;
    if (!Array.isArray(rawReservedInputs) || rawReservedInputs.length === 0) return;

    const reservedInputs = rawReservedInputs.filter(isReservedRefiningRequirement);
    const productionStorageId = this.getProductionStorageId();

    for (const input of reservedInputs) {
      this.inventoryManager.addQuantity(
        productionStorageId,
        input.itemId,
        input.quantity,
        {
          itemId: input.itemId,
          stackable: true,
          maxStack: 999,
        },
      );
    }
  }
}

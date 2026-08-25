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
import { DEFAULT_RUNTIME_TICK_INTERVAL_MS } from "./RuntimeLifecycle.js";

type SupportedRefiningFamily = SupportedProductionFamily;

export interface ReservedRefiningRequirement {
  readonly itemId: string;
  readonly quantity: number;
}

export type ToggleRefiningResult =
  | { readonly action: "started"; readonly family: ResourceFamily }
  | { readonly action: "stopped"; readonly family: ResourceFamily }
  | { readonly action: "completed"; readonly family: ResourceFamily; readonly cycles: number }
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
  readonly isInstantRefiningUnlocked?: () => boolean;
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

export interface SavedRefiningSessionV2 {
  readonly family: SupportedRefiningFamily;
  readonly tier: ProductionTier;
  readonly automatic: boolean;
  readonly elapsedTicks: number;
  readonly reservedInputs: readonly ReservedRefiningRequirement[];
}

export interface SavedRefiningPayloadV2 {
  readonly version: 2;
  readonly sessions: readonly SavedRefiningSessionV2[];
}

export interface SavedRefiningRecoveryPayloadV1 {
  readonly reservedInputs: readonly ReservedRefiningRequirement[];
}

function isSupportedRefiningFamily(
  family: ResourceFamily,
): family is SupportedRefiningFamily {
  return SUPPORTED_REFINING_FAMILIES.includes(
    family as SupportedRefiningFamily,
  );
}

function isProductionTier(value: unknown): value is ProductionTier {
  return typeof value === "number"
    && Number.isInteger(value)
    && value >= 3
    && value <= 8;
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

function parseSavedRefiningSession(value: unknown): SavedRefiningSessionV2 | undefined {
  if (value === null || typeof value !== "object") return undefined;
  const candidate = value as Record<string, unknown>;
  if (
    typeof candidate.family !== "string"
    || !isSupportedRefiningFamily(candidate.family)
    || !isProductionTier(candidate.tier)
    || typeof candidate.automatic !== "boolean"
    || typeof candidate.elapsedTicks !== "number"
    || !Number.isInteger(candidate.elapsedTicks)
    || candidate.elapsedTicks < 0
    || !Array.isArray(candidate.reservedInputs)
  ) return undefined;

  const reservedInputs = candidate.reservedInputs.filter(isReservedRefiningRequirement);
  if (reservedInputs.length !== candidate.reservedInputs.length) return undefined;

  return {
    family: candidate.family,
    tier: candidate.tier,
    automatic: candidate.automatic,
    elapsedTicks: candidate.elapsedTicks,
    reservedInputs,
  };
}

export class RefiningRuntime {
  private readonly inventoryManager: InventoryManager;
  private readonly productionStorageId: EntityId;
  private readonly getProductionTier: (family: SupportedRefiningFamily) => ProductionTier;
  private readonly isInstantRefiningUnlocked: () => boolean;
  private readonly families: Readonly<
    Record<SupportedRefiningFamily, RefiningFamilyRuntimeDefinition>
  >;
  private readonly states: Record<
    SupportedRefiningFamily,
    RefiningFamilyState
  >;
  private currentTickCounter = 0;
  private backgroundTickOffset = 0;
  private readonly completionListeners = new Set<
    (evt: RefiningCompletionEvent) => void
  >();
  private readonly backgroundCompletionEvents = new Map<
    ResourceFamily,
    RefiningCompletionEvent
  >();
  private isResolvingBackground = false;

  public constructor(deps: RefiningRuntimeDependencies) {
    this.inventoryManager = deps.inventoryManager;
    this.getProductionTier = deps.getProductionTier;
    this.isInstantRefiningUnlocked = deps.isInstantRefiningUnlocked ?? (() => false);

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
    if (this.isResolvingBackground) {
      this.backgroundCompletionEvents.set(evt.family, evt);
      return;
    }
    for (const listener of this.completionListeners) listener(evt);
  }

  /** Maps the live client tick onto the monotonic refining timeline. */
  public getRuntimeTick(tickCounter: number): number {
    return tickCounter + this.backgroundTickOffset;
  }

  public tick(tickCounter: number): void {
    const runtimeTick = this.getRuntimeTick(tickCounter);
    this.currentTickCounter = runtimeTick;
    for (const family of SUPPORTED_REFINING_FAMILIES) {
      const definition = this.families[family];
      definition.manager.tick(runtimeTick);

      const state = this.states[family];
      if (state.automatic && definition.manager.getActiveSession() === undefined) {
        if (!this.startRefiningCycle(family, this.getRecipe(family), runtimeTick)) {
          state.automatic = false;
          state.activeRecipe = undefined;
        }
      }
    }
  }

  /** Resolves passive refining time at completion boundaries instead of replaying live ticks. */
  public resolveBackground(elapsedMs: number, tickIntervalMs: number): void {
    if (!Number.isFinite(elapsedMs) || elapsedMs < 0) {
      throw new Error("Refining background elapsed time must be a finite non-negative number");
    }
    if (!Number.isFinite(tickIntervalMs) || tickIntervalMs <= 0) {
      throw new Error("Refining tick interval must be a finite positive number");
    }

    const elapsedTicks = Math.floor(elapsedMs / tickIntervalMs);
    if (elapsedTicks <= 0) return;

    const backgroundStartTick = this.currentTickCounter;
    const backgroundEndTick = backgroundStartTick + elapsedTicks;
    this.isResolvingBackground = true;
    this.backgroundCompletionEvents.clear();

    try {
      for (const family of SUPPORTED_REFINING_FAMILIES) {
        const definition = this.families[family];
        const state = this.states[family];

        while (state.automatic) {
          let session = definition.manager.getActiveSession();
          if (session === undefined) {
            this.currentTickCounter = backgroundStartTick;
            if (!this.startRefiningCycle(family, this.getRecipe(family), backgroundStartTick)) break;
            session = definition.manager.getActiveSession();
            if (session === undefined) break;
          }

          const completionTick = session.startTick + session.getRequiredTicks();
          if (completionTick > backgroundEndTick) {
            definition.manager.tick(backgroundEndTick);
            break;
          }

          this.currentTickCounter = completionTick;
          definition.manager.tick(completionTick);
          if (!state.automatic) break;

          const nextSession = definition.manager.getActiveSession();
          if (nextSession === undefined || nextSession.startTick < completionTick) break;
        }
      }
    } finally {
      this.currentTickCounter = backgroundEndTick;
      this.backgroundTickOffset += elapsedTicks;
      this.isResolvingBackground = false;
      const completionEvents = [...this.backgroundCompletionEvents.values()];
      this.backgroundCompletionEvents.clear();
      for (const event of completionEvents) this.notifyRefineCompleted(event);
    }
  }

  public getPersistenceState(): SavedRefiningPayloadV2 {
    const sessions: SavedRefiningSessionV2[] = [];
    for (const family of SUPPORTED_REFINING_FAMILIES) {
      const session = this.families[family].manager.getActiveSession();
      const state = this.states[family];
      if (session === undefined || state.activeRecipe === undefined) continue;
      const elapsedTicks = Math.max(
        0,
        Math.min(
          session.getRequiredTicks() - 1,
          this.currentTickCounter - session.startTick,
        ),
      );
      sessions.push({
        family,
        tier: state.activeRecipe.tier,
        automatic: state.automatic,
        elapsedTicks,
        reservedInputs: state.reservedInputs.map((input) => ({ ...input })),
      });
    }
    return { version: 2, sessions };
  }

  public restorePersistenceState(data: SavedRefiningPayloadV2): void {
    this.resetForPersistenceLoad();

    for (const saved of data.sessions) {
      const recipe = this.getRecipe(saved.family, saved.tier);
      const requiredTicks = recipe.durationTicks;
      const elapsedTicks = Math.min(saved.elapsedTicks, Math.max(0, requiredTicks - 1));
      const state = this.states[saved.family];
      const definition = this.families[saved.family];

      state.automatic = saved.automatic;
      state.reservedInputs = saved.reservedInputs.map((input) => ({ ...input }));
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
        this.currentTickCounter - elapsedTicks,
      );

      if (!started.ok) {
        state.automatic = false;
        state.reservedInputs = [];
        state.activeRecipe = undefined;
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

  public isInstantModeEnabled(): boolean {
    return this.isInstantRefiningUnlocked();
  }

  /**
   * Persistence load replaces the authoritative production-storage snapshot.
   * Any live sessions belong to the pre-load timeline and must therefore be
   * discarded without refunding their in-memory reservations into the restored
   * inventory.
   */
  public resetForPersistenceLoad(): void {
    this.backgroundTickOffset = 0;
    this.backgroundCompletionEvents.clear();
    this.isResolvingBackground = false;
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

  private getAvailableCycles(recipe: ProductionRefiningRecipe): number {
    return recipe.requirements.reduce((availableCycles, requirement) => {
      const available = this.inventoryManager.getTotalQuantity(
        this.productionStorageId,
        requirement.itemId,
      );
      return Math.min(availableCycles, Math.floor(available / requirement.quantity));
    }, Number.POSITIVE_INFINITY);
  }

  private refineInstantly(
    family: SupportedRefiningFamily,
    requestedCycles?: number,
  ): ToggleRefiningResult {
    const recipe = this.getRecipe(family);
    const availableCycles = this.getAvailableCycles(recipe);
    if (!Number.isFinite(availableCycles) || availableCycles <= 0) {
      return { action: "failed", family };
    }
    if (
      requestedCycles !== undefined
      && (!Number.isInteger(requestedCycles) || requestedCycles <= 0)
    ) {
      return { action: "failed", family };
    }

    const cycles = requestedCycles === undefined
      ? availableCycles
      : Math.min(requestedCycles, availableCycles);
    const batchRequirements = recipe.requirements.map((requirement) => ({
      itemId: requirement.itemId,
      quantity: requirement.quantity * cycles,
    }));
    const reserved = this.reserveRefiningRequirements(batchRequirements);
    if (reserved === undefined) return { action: "failed", family };

    const outputQuantity = recipe.outputQuantity * cycles;
    const added = this.inventoryManager.addQuantity(
      this.productionStorageId,
      recipe.outputItemId,
      outputQuantity,
      {
        itemId: recipe.outputItemId,
        stackable: true,
        maxStack: 999,
      },
    );
    if (!added.ok) {
      this.refundRefiningRequirements(reserved);
      return { action: "failed", family };
    }

    this.notifyRefineCompleted({
      family,
      added: true,
      outputItemId: recipe.outputItemId,
      outputQuantity,
    });
    return { action: "completed", family, cycles };
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
          state.automatic = false;
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
    requestedCycles?: number,
  ): ToggleRefiningResult {
    const state = this.states[family];
    if (state.automatic) {
      this.stopRefiningFamily(family);
      return { action: "stopped", family };
    }

    if (this.isInstantRefiningUnlocked()) {
      return this.refineInstantly(family, requestedCycles);
    }

    state.automatic = true;
    const runtimeTick = this.getRuntimeTick(tickCounter);
    if (!this.startRefiningCycle(family, this.getRecipe(family), runtimeTick)) {
      state.automatic = false;
      return { action: "failed", family };
    }
    return { action: "started", family };
  }
}

export class RefiningSaveProvider implements SaveProvider {
  readonly providerId = "refining";

  constructor(
    private readonly refiningRuntime: RefiningRuntime,
    private readonly inventoryManager: InventoryManager,
    private readonly getProductionStorageId: () => EntityId,
  ) {}

  save(): unknown {
    return this.refiningRuntime.getPersistenceState();
  }

  load(data: unknown): void {
    if (
      data !== null
      && typeof data === "object"
      && "version" in data
      && data.version === 2
      && "sessions" in data
      && Array.isArray(data.sessions)
    ) {
      const sessions = data.sessions
        .map(parseSavedRefiningSession)
        .filter((session): session is SavedRefiningSessionV2 => session !== undefined);
      this.refiningRuntime.restorePersistenceState({ version: 2, sessions });
      return;
    }

    // Legacy V1 snapshots only tracked reserved inputs. They cannot resume the
    // original session safely, so keep the established recovery behavior and
    // return the reservations to production storage exactly once.
    this.refiningRuntime.resetForPersistenceLoad();
    if (
      data === null
      || typeof data !== "object"
      || !("reservedInputs" in data)
      || !Array.isArray(data.reservedInputs)
    ) return;

    const reservedInputs = data.reservedInputs.filter(isReservedRefiningRequirement);
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

  resolveBackground(elapsedMs: number): void {
    this.refiningRuntime.resolveBackground(
      elapsedMs,
      DEFAULT_RUNTIME_TICK_INTERVAL_MS,
    );
  }
}
